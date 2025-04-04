import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { loadDataSources } from './data/dataLoader.js';
import { getRealEstateHotspots } from './analysis/hotspotAnalysis.js';
import { getLivabilityScore } from './analysis/livabilityAnalysis.js';
import { calculateMobilityScore } from './analysis/mobilityAnalysis.js';
import axios from 'axios';
import { calculateEmergencyServicesScore } from './analysis/emergencyAnalysis.js';
import { calculateHaversineDistance } from './analysis/customGeoAnalysis.js';
import { calculateGroceryScore } from './analysis/groceryAnalysis.js';
import { calculateRestaurantScore } from './analysis/restaurantAnalysis.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json());

// Enable CORS for frontend requests
app.use(cors());

// Define port
const PORT = process.env.PORT || 3001;

// Initialize by loading data sources
let dataSources = {};
loadDataSources().then(data => {
    dataSources = data;
    console.log('Data sources loaded successfully');
}).catch(err => {
    console.error('Error loading data sources:', err);
    dataSources = {
        groceryStores: [],
        emergencyServices: [],
        mainRoads: [],
        amenities: [],
        education: [],
        parks: []
    };
});

/**
 * Geocode an address using Open Street Maps Nominatim API
 * @param {string} address - Address to geocode
 * @param {string} city - City (defaults to Ottawa)
 * @param {string} province - Province (defaults to ON)
 * @param {string} country - Country (defaults to Canada)
 * @returns {Promise<Object>} - Geocoded location
 */
const geocodeAddress = async (address, city = 'Ottawa', province = 'ON', country = 'Canada') => {
  try {
    // Format the query
    const query = encodeURIComponent(`${address}, ${city}, ${province}, ${country}`);
    
    // Use OpenStreetMap Nominatim API (free and doesn't require API key)
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1`,
      { headers: { 'User-Agent': 'Real-Estate-Mapping/1.0' } }
    );
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      
      // Verify the address is in Ottawa
      const isInOttawa = 
        (result.address?.city?.toLowerCase() === 'ottawa') || 
        (result.address?.town?.toLowerCase() === 'ottawa') ||
        (result.address?.county?.toLowerCase().includes('ottawa')) ||
        (result.address?.state?.toLowerCase() === 'ontario' && 
         (result.display_name?.toLowerCase().includes('ottawa') ||
          parseFloat(result.lat) > 45.0 && parseFloat(result.lat) < 45.6 && 
          parseFloat(result.lon) > -76.0 && parseFloat(result.lon) < -75.3));
      
      if (!isInOttawa) {
        throw new Error('Address is not located in Ottawa');
      }
      
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
        addressDetails: result.address
      };
    } else {
      throw new Error('No results found for the given address');
    }
  } catch (error) {
    console.error('Error geocoding address:', error.message);
    throw error;
  }
};

// Calculate overall combined score for address analysis
const calculateOverallScore = (mobility, livability, emergency) => {
  // Weights
  const weights = {
    mobility: 0.35,
    livability: 0.40,
    emergency: 0.25
  };
  
  return Math.round(
    mobility * weights.mobility +
    livability * weights.livability +
    emergency * weights.emergency
  );
};

// API Routes

// Get hotspots based on location
app.get('/api/hotspots', (req, res) => {
    try {
        const hotspots = getRealEstateHotspots(dataSources);
        res.json(hotspots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get livability score based on location
app.get('/api/livability', async (req, res) => {
  try {
    const { lat, lng, radius = 3000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const result = await getLivabilityScore({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting livability score:', error);
    res.status(500).json({ error: 'Failed to get livability score' });
  }
});

// Get mobility score based on location
app.get('/api/mobility', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const result = calculateMobilityScore({
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting mobility score:', error);
    res.status(500).json({ error: 'Failed to get mobility score' });
  }
});

// Analyze address endpoint
app.get('/api/analyze-address', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Geocode the address
    const geocodeResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: `${address}, Ottawa, Canada`,
        format: 'json',
        limit: 1,
        countrycodes: 'ca'
      },
      headers: {
        'User-Agent': 'RealEstateMapping/1.0'
      }
    });

    if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
      return res.status(404).json({ error: 'Address not found in Ottawa' });
    }

    const location = geocodeResponse.data[0];
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lon);

    // Check if the address is in Ottawa (approximately)
    const ottawaCenter = { lat: 45.4215, lng: -75.6972 };
    const distanceToOttawaCenter = 
      calculateHaversineDistance(
        { lat, lng },
        ottawaCenter
      );
    
    if (distanceToOttawaCenter > 30000) { // 30km radius from Ottawa center
      return res.status(400).json({ error: 'Address is outside Ottawa region' });
    }

    console.log('Calculating mobility score...');
    // Calculate scores
    const mobilityScore = calculateMobilityScore({
      lat: lat,
      lng: lng
    });
    
    console.log('Calculating livability score...');
    const livabilityResults = getLivabilityScore({
      lat: lat,
      lng: lng
    });
    
    console.log('Calculating emergency services score...');
    const emergencyServicesResults = calculateEmergencyServicesScore({
      lat: lat,
      lng: lng
    });

    console.log('Mobility score:', mobilityScore);
    console.log('Livability results:', JSON.stringify(livabilityResults, null, 2));
    console.log('Emergency services results:', JSON.stringify(emergencyServicesResults, null, 2));

    // Calculate overall score (weighted average)
    const overallScore = calculateOverallScore(
      mobilityScore.score || 0,
      livabilityResults?.score || 0,
      emergencyServicesResults?.score || 0
    );

    // Format the response to include detailed information with places for the frontend
    const result = {
      geocodedAddress: location.display_name,
      lat,
      lng,
      scores: {
        mobility: {
          score: mobilityScore.score || 0,
          transitStationScore: mobilityScore.transitStationScore || 0,
          busStopScore: mobilityScore.busStopScore || 0,
          roadAccessScore: mobilityScore.roadAccessScore || 0,
          nearestTransitStation: mobilityScore.nearestTransitStation || null,
          nearestBusStop: mobilityScore.nearestBusStop || null,
          nearestMainRoad: mobilityScore.nearestMainRoad || null
        },
        livability: {
          score: livabilityResults?.score || 0,
          categoryScores: livabilityResults?.categoryScores || {},
          places: livabilityResults?.places || {}
        },
        emergencyServices: {
          score: emergencyServicesResults?.score || 0,
          medical: {
            score: emergencyServicesResults?.hospitalScore || 0,
            hospitals: Array.isArray(emergencyServicesResults?.hospitals)
              ? emergencyServicesResults.hospitals.map(service => ({
                  name: service.name || 'Unknown Hospital',
                  address: service.address || 'Address not available',
                  lat: parseFloat(service.lat) || 0,
                  lng: parseFloat(service.lng) || 0,
                  distance: service.distance || 0,
                  rating: parseFloat(service.rating) || 0
                }))
              : [],
            nearest: emergencyServicesResults?.nearestHospital || null
          },
          fire: {
            score: emergencyServicesResults?.fireStationScore || 0,
            stations: Array.isArray(emergencyServicesResults?.fireStations)
              ? emergencyServicesResults.fireStations.map(service => ({
                  name: service.name || 'Unknown Fire Station',
                  address: service.address || 'Address not available',
                  lat: parseFloat(service.lat) || 0,
                  lng: parseFloat(service.lng) || 0,
                  distance: service.distance || 0,
                  rating: parseFloat(service.rating) || 0
                }))
              : [],
            nearest: emergencyServicesResults?.nearestFireStation || null
          },
          police: {
            score: emergencyServicesResults?.policeStationScore || 0,
            stations: Array.isArray(emergencyServicesResults?.policeStations)
              ? emergencyServicesResults.policeStations.map(service => ({
                  name: service.name || 'Unknown Police Station',
                  address: service.address || 'Address not available',
                  lat: parseFloat(service.lat) || 0,
                  lng: parseFloat(service.lng) || 0,
                  distance: service.distance || 0,
                  rating: parseFloat(service.rating) || 0
                }))
              : [],
            nearest: emergencyServicesResults?.nearestPoliceStation || null
          }
        },
        overallScore
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error analyzing address:', error);
    res.status(500).json({ error: 'Failed to analyze address' });
  }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Load data sources
    loadDataSources().then(data => {
        dataSources = data;
        console.log(`Loaded ${dataSources.groceryStores?.length || 0} grocery stores`);
        console.log(`Loaded ${dataSources.emergencyServices?.length || 0} emergency services`);
        console.log(`Loaded ${dataSources.mainRoads?.length || 0} main roads`);
        console.log(`Loaded ${dataSources.amenities?.length || 0} amenities`);
        console.log(`Loaded ${dataSources.education?.length || 0} educational institutions`);
        console.log(`Loaded ${dataSources.parks?.length || 0} parks`);
        console.log('Data sources loaded successfully');
    }).catch(err => {
        console.error('Error loading data sources:', err);
    });
});