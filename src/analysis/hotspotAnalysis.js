import geolib from 'geolib';
import { getGroceryStores, getEmergencyServices, getMainRoads } from '../data/dataLoader.js';
import { getLivabilityScore } from './livabilityAnalysis.js';

/**
 * Calculate score for proximity to grocery stores
 * @param {Object} location - Location with lat and lng
 * @returns {number} - Score from 0-100
 */
const calculateGroceryStoreScore = (location) => {
  const groceryStores = getGroceryStores();
  
  if (groceryStores.length === 0) {
    return 0;
  }
  
  // Find distances to all grocery stores
  const distances = groceryStores.map(store => {
    return geolib.getDistance(
      { latitude: location.lat, longitude: location.lng },
      { latitude: parseFloat(store.lat), longitude: parseFloat(store.lng) }
    );
  });
  
  // Sort distances
  distances.sort((a, b) => a - b);
  
  // Calculate score based on closest store (max 100 points if within 500m, 0 if beyond 5km)
  const closestDistance = distances[0];
  
  if (closestDistance <= 500) {
    return 100;
  } else if (closestDistance >= 5000) {
    return 0;
  } else {
    // Linear score between 500m and 5000m
    return Math.round(100 - ((closestDistance - 500) / 4500) * 100);
  }
};

/**
 * Calculate score for proximity to emergency services
 * @param {Object} location - Location with lat and lng
 * @returns {number} - Score from 0-100
 */
const calculateEmergencyServicesScore = (location) => {
  const emergencyServices = getEmergencyServices();
  
  if (emergencyServices.length === 0) {
    return 0;
  }
  
  // Group services by type
  const servicesByType = {};
  emergencyServices.forEach(service => {
    if (!servicesByType[service.type]) {
      servicesByType[service.type] = [];
    }
    servicesByType[service.type].push(service);
  });
  
  // For each type, find closest service
  const scores = [];
  
  for (const [type, services] of Object.entries(servicesByType)) {
    // Find closest service of this type
    let closestDistance = Infinity;
    
    for (const service of services) {
      const distance = geolib.getDistance(
        { latitude: location.lat, longitude: location.lng },
        { latitude: parseFloat(service.lat), longitude: parseFloat(service.lng) }
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }
    
    // Calculate score for this type (max 100 points if within 1km, 0 if beyond 10km)
    let typeScore = 0;
    
    if (closestDistance <= 1000) {
      typeScore = 100;
    } else if (closestDistance >= 10000) {
      typeScore = 0;
    } else {
      // Linear score between 1km and 10km
      typeScore = Math.round(100 - ((closestDistance - 1000) / 9000) * 100);
    }
    
    scores.push(typeScore);
  }
  
  // Average scores from all types
  if (scores.length === 0) {
    return 0;
  }
  
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

/**
 * Calculate score for proximity to main roads
 * @param {Object} location - Location with lat and lng
 * @returns {number} - Score from 0-100
 */
const calculateMainRoadsScore = (location) => {
  const mainRoads = getMainRoads();
  
  if (mainRoads.length === 0) {
    return 0;
  }
  
  // Calculate minimum distance to any road
  let minDistance = Infinity;
  
  for (const road of mainRoads) {
    // For each road, calculate distance to the line segment
    const start = { latitude: parseFloat(road.start_lat), longitude: parseFloat(road.start_lng) };
    const end = { latitude: parseFloat(road.end_lat), longitude: parseFloat(road.end_lng) };
    const point = { latitude: location.lat, longitude: location.lng };
    
    // Simple line segment distance calculation
    const distance = geolib.getDistanceFromLine(point, start, end);
    
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  // Calculate score (max 100 points if within 500m, 0 if beyond 5km)
  if (minDistance <= 500) {
    return 100;
  } else if (minDistance >= 5000) {
    return 0;
  } else {
    // Linear score between 500m and 5000m
    return Math.round(100 - ((minDistance - 500) / 4500) * 100);
  }
};

/**
 * Calculate overall score for a location
 * @param {Object} location - Location with lat and lng
 * @returns {Object} - Location with scores
 */
const calculateLocationScore = (location) => {
  // Calculate individual scores
  const groceryScore = calculateGroceryStoreScore(location);
  const emergencyScore = calculateEmergencyServicesScore(location);
  const roadScore = calculateMainRoadsScore(location);
  
  // Calculate weighted overall score
  // Weights can be adjusted based on importance of each factor
  const weights = {
    grocery: 0.4,
    emergency: 0.4,
    road: 0.2
  };
  
  const overallScore = Math.round(
    groceryScore * weights.grocery +
    emergencyScore * weights.emergency +
    roadScore * weights.road
  );
  
  return {
    ...location,
    scores: {
      grocery: groceryScore,
      emergency: emergencyScore,
      road: roadScore,
      overall: overallScore
    }
  };
};

/**
 * Generate a grid of locations around a center point
 * @param {Object} center - Center location with lat and lng
 * @param {number} radius - Radius in meters
 * @param {number} step - Distance between grid points in meters
 * @returns {Array} - Array of locations
 */
const generateLocationGrid = (center, radius, step = 500) => {
  const locations = [];
  
  // Calculate boundaries
  const boundaries = geolib.getBoundsOfDistance(
    { latitude: center.lat, longitude: center.lng },
    radius
  );
  
  // Convert to simpler format for easier looping
  const bounds = {
    minLat: boundaries[0].latitude,
    maxLat: boundaries[1].latitude,
    minLng: boundaries[0].longitude,
    maxLng: boundaries[1].longitude
  };
  
  // Generate grid within bounds
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += step / 111111) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += step / (111111 * Math.cos(lat * (Math.PI / 180)))) {
      // Check if point is within radius from center
      const distance = geolib.getDistance(
        { latitude: center.lat, longitude: center.lng },
        { latitude: lat, longitude: lng }
      );
      
      if (distance <= radius) {
        locations.push({ lat, lng });
      }
    }
  }
  
  return locations;
};

/**
 * Enhance a hotspot with livability data
 * @param {Object} hotspot - Hotspot to enhance
 * @returns {Promise<Object>} - Enhanced hotspot with livability data
 */
const enhanceHotspotWithLivability = async (hotspot) => {
  try {
    // Get livability score
    const livabilityData = await getLivabilityScore({
      lat: hotspot.center.lat,
      lng: hotspot.center.lng,
      radius: 3000
    });
    
    // Combine basic score with livability score
    const combinedScore = Math.round(
      (hotspot.score * 0.6) + (livabilityData.overallScore * 0.4)
    );
    
    return {
      ...hotspot,
      livabilityScore: livabilityData.overallScore,
      livabilityDetails: {
        retail: {
          score: livabilityData.categoryScores.retail.score,
          places: livabilityData.categoryScores.retail.items
        },
        restaurant: {
          score: livabilityData.categoryScores.restaurant.score,
          places: livabilityData.categoryScores.restaurant.items
        },
        entertainment: {
          score: livabilityData.categoryScores.entertainment.score,
          places: livabilityData.categoryScores.entertainment.items
        },
        park: {
          score: livabilityData.categoryScores.park.score,
          places: livabilityData.categoryScores.park.items
        },
        school: {
          score: livabilityData.categoryScores.school.score,
          places: livabilityData.categoryScores.school.items
        }
      },
      combinedScore
    };
  } catch (error) {
    console.error('Error enhancing hotspot with livability data:', error);
    return hotspot;
  }
};

/**
 * Find real estate hotspots around a location
 * @param {Object} params - Parameters with lat, lng, and radius
 * @returns {Object} - Analysis results with hotspots ranked by score
 */
export const getRealEstateHotspots = async (params) => {
  const { lat, lng, radius = 5000, includeLivability = true } = params;
  
  // Generate grid of locations to analyze
  const grid = generateLocationGrid({ lat, lng }, radius);
  
  // Calculate scores for each location
  const scoredLocations = grid.map(location => calculateLocationScore(location));
  
  // Sort by overall score (descending)
  scoredLocations.sort((a, b) => b.scores.overall - a.scores.overall);
  
  // Group locations into hotspot clusters
  const hotspots = [];
  const hotspotRadius = 500; // Radius to consider as same hotspot (meters)
  
  // Take top 50% of scored locations for clustering
  const topLocations = scoredLocations.slice(0, Math.ceil(scoredLocations.length / 2));
  
  for (const location of topLocations) {
    // Check if location is already within an existing hotspot
    const isInExistingHotspot = hotspots.some(hotspot => {
      const distance = geolib.getDistance(
        { latitude: location.lat, longitude: location.lng },
        { latitude: hotspot.center.lat, longitude: hotspot.center.lng }
      );
      return distance <= hotspotRadius;
    });
    
    if (!isInExistingHotspot && location.scores.overall >= 50) {
      // Create new hotspot
      hotspots.push({
        center: {
          lat: location.lat,
          lng: location.lng
        },
        score: location.scores.overall,
        details: location.scores
      });
    }
  }
  
  // Limit to top 10 hotspots
  let topHotspots = hotspots.sort((a, b) => b.score - a.score).slice(0, 10);
  
  // Enhance hotspots with livability data if requested
  if (includeLivability) {
    // Get livability data for top 3 hotspots only to keep performance reasonable
    const enhancedHotspots = await Promise.all(
      topHotspots.slice(0, 3).map(hotspot => enhanceHotspotWithLivability(hotspot))
    );
    
    // Replace top 3 hotspots with enhanced versions
    topHotspots = [
      ...enhancedHotspots,
      ...topHotspots.slice(3)
    ];
    
    // Sort by combined score if available, otherwise by original score
    topHotspots.sort((a, b) => {
      if (a.combinedScore !== undefined && b.combinedScore !== undefined) {
        return b.combinedScore - a.combinedScore;
      }
      return b.score - a.score;
    });
  }
  
  return {
    center: { lat, lng },
    radius,
    analyzed: grid.length,
    hotspots: topHotspots
  };
}; 