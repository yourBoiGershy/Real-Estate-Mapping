#!/usr/bin/env node
import dotenv from 'dotenv';
import axios from 'axios';
import { loadDataSources } from './data/dataLoader.js';
import { getLivabilityScore } from './analysis/livabilityAnalysis.js';
import { calculateMobilityScore } from './analysis/mobilityAnalysis.js';
import { getRealEstateHotspots } from './analysis/hotspotAnalysis.js';

// Load environment variables
dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Print colored score
const printScore = (score) => {
  let color = colors.red;
  if (score >= 80) {
    color = colors.green;
  } else if (score >= 60) {
    color = colors.yellow;
  } else if (score >= 40) {
    color = colors.magenta;
  }
  return `${color}${score}${colors.reset}`;
};

// Print rating stars
const printStars = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
  return (
    colors.yellow + '★'.repeat(fullStars) + 
    (halfStar ? '½' : '') + 
    colors.dim + '☆'.repeat(emptyStars) + 
    colors.reset
  );
};

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
    const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1`);
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      
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

// Print mobility details
const printMobilityDetails = (mobilityData) => {
  console.log(`\n${colors.bright}${colors.blue}MOBILITY SCORE: ${printScore(mobilityData.overallScore)}/100${colors.reset}\n`);
  
  // Print category scores
  console.log(`${colors.bright}Mobility Details:${colors.reset}`);
  
  // Transit station
  console.log(`${colors.bright}TRANSIT STATION:${colors.reset} ${printScore(mobilityData.details.station.score)}/100`);
  if (mobilityData.details.station.nearest) {
    console.log(`  Nearest station: ${colors.bright}${mobilityData.details.station.nearest.name}${colors.reset} (${mobilityData.details.station.distance}m away)`);
    console.log(`  Station ID: ${mobilityData.details.station.nearest.id}`);
  } else {
    console.log(`  No stations within reasonable distance`);
  }
  
  // Bus stop
  console.log(`\n${colors.bright}BUS STOP:${colors.reset} ${printScore(mobilityData.details.busStop.score)}/100`);
  if (mobilityData.details.busStop.nearest) {
    console.log(`  Nearest bus stop: ID ${mobilityData.details.busStop.nearest.id} (${mobilityData.details.busStop.distance}m away)`);
    console.log(`  Routes: ${mobilityData.details.busStop.nearest.routes.join(', ')}`);
  } else {
    console.log(`  No bus stops within reasonable distance`);
  }
  
  // Road access
  console.log(`\n${colors.bright}ROAD ACCESS:${colors.reset} ${printScore(mobilityData.details.road.score)}/100`);
  if (mobilityData.details.road.nearest) {
    console.log(`  Nearest main road: ${colors.bright}${mobilityData.details.road.nearest.name}${colors.reset} (${mobilityData.details.road.distance}m away)`);
  } else {
    console.log(`  No main roads within reasonable distance`);
  }
};

// Print livability details
const printLivabilityDetails = (livabilityData) => {
  console.log(`\n${colors.bright}${colors.cyan}LIVABILITY SCORE: ${printScore(livabilityData.overallScore)}/100${colors.reset}\n`);
  
  // Print category scores
  console.log(`${colors.bright}Category Scores:${colors.reset}`);
  console.log(`${colors.bright}RETAIL:${colors.reset} ${printScore(livabilityData.categoryScores.retail.score)}/100 (${livabilityData.categoryScores.retail.count} places, avg ${livabilityData.categoryScores.retail.averageDistance}m away, rating ${livabilityData.categoryScores.retail.averageRating})`);
  console.log(`${colors.bright}RESTAURANTS:${colors.reset} ${printScore(livabilityData.categoryScores.restaurant.score)}/100 (${livabilityData.categoryScores.restaurant.count} places, avg ${livabilityData.categoryScores.restaurant.averageDistance}m away, rating ${livabilityData.categoryScores.restaurant.averageRating})`);
  console.log(`${colors.bright}ENTERTAINMENT:${colors.reset} ${printScore(livabilityData.categoryScores.entertainment.score)}/100 (${livabilityData.categoryScores.entertainment.count} places, avg ${livabilityData.categoryScores.entertainment.averageDistance}m away, rating ${livabilityData.categoryScores.entertainment.averageRating})`);
  console.log(`${colors.bright}PARKS:${colors.reset} ${printScore(livabilityData.categoryScores.park.score)}/100 (${livabilityData.categoryScores.park.count} places, avg ${livabilityData.categoryScores.park.averageDistance}m away, rating ${livabilityData.categoryScores.park.averageRating})`);
  console.log(`${colors.bright}SCHOOLS:${colors.reset} ${printScore(livabilityData.categoryScores.school.score)}/100 (${livabilityData.categoryScores.school.count} places, avg ${livabilityData.categoryScores.school.averageDistance}m away, rating ${livabilityData.categoryScores.school.averageRating})`);
  
  // Print nearby places by category - fix undefined issue
  const printNearbyPlaces = (category, title) => {
    const items = livabilityData.categoryScores[category].items;
    if (!items || items.length === 0) {
      return;
    }
    
    console.log(`\n${colors.bright}${colors.underline}Nearby ${title}:${colors.reset}`);
    items.forEach((item, i) => {
      console.log(`  ${i+1}. ${colors.bright}${item.name}${colors.reset} - ${item.distance}m away ${printStars(item.rating)}`);
    });
  };
  
  printNearbyPlaces('retail', 'Retail');
  printNearbyPlaces('restaurant', 'Restaurants');
  printNearbyPlaces('entertainment', 'Entertainment');
  printNearbyPlaces('park', 'Parks');
  printNearbyPlaces('school', 'Schools');
};

// Print emergency services details
const printEmergencyServicesDetails = (hotspotData) => {
  if (!hotspotData || !hotspotData.hotspots || hotspotData.hotspots.length === 0) {
    console.log(`\n${colors.bright}${colors.red}EMERGENCY SERVICES: No data available${colors.reset}`);
    return;
  }
  
  const topHotspot = hotspotData.hotspots[0];
  
  console.log(`\n${colors.bright}${colors.red}EMERGENCY SERVICES SCORE: ${printScore(topHotspot.details.emergency)}/100${colors.reset}`);
  console.log(`${colors.bright}GROCERY STORE SCORE: ${printScore(topHotspot.details.grocery)}/100${colors.reset}`);
};

// Calculate overall combined score
const calculateOverallScore = (mobility, livability, emergency, grocery) => {
  // Weights
  const weights = {
    mobility: 0.3,
    livability: 0.3,
    emergency: 0.25,
    grocery: 0.15
  };
  
  return Math.round(
    mobility * weights.mobility +
    livability * weights.livability +
    emergency * weights.emergency +
    grocery * weights.grocery
  );
};

// Main function
const analyzeAddress = async () => {
  try {
    console.log('Loading data sources...');
    await loadDataSources();
    
    console.log('\n===== OTTAWA ADDRESS ANALYSIS =====\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.error('Please provide an address to analyze.');
      console.log('Usage: npm run analyze-address "123 Main St, Ottawa, ON"');
      process.exit(1);
    }
    
    // Join all arguments as the address
    const addressInput = args.join(' ');
    console.log(`Analyzing address: ${colors.bright}${addressInput}${colors.reset}`);
    
    // Geocode the address
    console.log('\nGeocoding address...');
    const location = await geocodeAddress(addressInput);
    
    console.log(`\nGeocoded location: ${colors.bright}${location.displayName}${colors.reset}`);
    console.log(`Coordinates: (${location.lat}, ${location.lng})`);
    
    // Set analysis radius (3km)
    const radius = 3000;
    
    // Get mobility score
    console.log('\nCalculating mobility score...');
    const mobilityData = calculateMobilityScore(location);
    
    // Get livability score
    console.log('Calculating livability score...');
    const livabilityData = await getLivabilityScore({
      lat: location.lat,
      lng: location.lng,
      radius
    });
    
    // Get hotspot data for emergency services and grocery scores
    console.log('Calculating emergency services and grocery store proximity...');
    const hotspotData = await getRealEstateHotspots({
      lat: location.lat,
      lng: location.lng,
      radius,
      includeLivability: false
    });
    
    // Extract emergency and grocery scores from the hotspot data
    let emergencyScore = 0;
    let groceryScore = 0;
    
    if (hotspotData && hotspotData.hotspots && hotspotData.hotspots.length > 0) {
      const topHotspot = hotspotData.hotspots[0];
      if (topHotspot.details) {
        emergencyScore = topHotspot.details.emergency;
        groceryScore = topHotspot.details.grocery;
      }
    }
    
    // Calculate overall score
    const overallScore = calculateOverallScore(
      mobilityData.overallScore,
      livabilityData.overallScore,
      emergencyScore,
      groceryScore
    );
    
    // Display results
    console.log(`\n${colors.bright}${colors.bgGreen}${colors.black} COMPREHENSIVE ADDRESS ANALYSIS ${colors.reset}`);
    console.log(`\n${colors.bright}${colors.bgWhite}${colors.black} OVERALL SCORE: ${printScore(overallScore)}/100 ${colors.reset}`);
    
    // Print mobility details
    printMobilityDetails(mobilityData);
    
    // Print livability details
    printLivabilityDetails(livabilityData);
    
    // Print emergency services details
    printEmergencyServicesDetails(hotspotData);
    
    console.log('\n' + '-'.repeat(60));
    console.log(`\nAnalysis complete for ${colors.bright}${addressInput}${colors.reset}!`);
    
  } catch (error) {
    console.error('Error analyzing address:', error.message);
    process.exit(1);
  }
};

// Run the analysis
analyzeAddress(); 