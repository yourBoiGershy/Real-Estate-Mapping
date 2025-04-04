import { getGroceryStores, getEmergencyServices, getMainRoads } from '../data/dataLoader.js';
import {
  calculateHaversineDistance,
  calculateDistanceToLineSegment,
  generateLocationGrid,
  calculateWeightedScore
} from './customGeoAnalysis.js';

/**
 * Calculate score for proximity to grocery stores
 * Using custom implementation rather than geolib
 * @param {Object} location - Location with lat and lng
 * @returns {number} - Score from 0-100
 */
const calculateGroceryStoreScore = (location) => {
  const groceryStores = getGroceryStores();
  
  if (groceryStores.length === 0) {
    return 0;
  }
  
  // Find distances to all grocery stores using our custom distance function
  const distances = groceryStores.map(store => {
    return calculateHaversineDistance(
      { lat: location.lat, lng: location.lng },
      { lat: parseFloat(store.lat), lng: parseFloat(store.lng) }
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
 * Using custom implementation rather than geolib
 * @param {Object} location - Location with lat and lng
 * @returns {number} - Score from 0-100
 */
const customCalculateEmergencyServicesScore = (location) => {
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
      const distance = calculateHaversineDistance(
        { lat: location.lat, lng: location.lng },
        { lat: parseFloat(service.lat), lng: parseFloat(service.lng) }
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
 * Using custom implementation rather than geolib
 * @param {Object} location - Location with lat and lng
 * @returns {number} - Score from 0-100
 */
const calculateMainRoadsScore = (location) => {
  const mainRoads = getMainRoads();
  
  if (mainRoads.length === 0) {
    return 0;
  }
  
  // Calculate minimum distance to any road using our custom line segment distance function
  let minDistance = Infinity;
  
  for (const road of mainRoads) {
    // For each road, calculate distance to the line segment
    const start = { lat: parseFloat(road.start_lat), lng: parseFloat(road.start_lng) };
    const end = { lat: parseFloat(road.end_lat), lng: parseFloat(road.end_lng) };
    const point = { lat: location.lat, lng: location.lng };
    
    // Use our custom distance-to-line function
    const distance = calculateDistanceToLineSegment(point, start, end);
    
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
 * Calculate overall score for a location using custom implementations
 * @param {Object} location - Location with lat and lng
 * @returns {Object} - Location with scores
 */
const calculateLocationScore = (location) => {
  // Calculate individual scores using our custom functions
  const groceryScore = calculateGroceryStoreScore(location);
  const emergencyScore = customCalculateEmergencyServicesScore(location);
  const roadScore = calculateMainRoadsScore(location);
  
  // Calculate weighted overall score using our custom weighting function
  const weights = {
    grocery: 0.4,
    emergency: 0.4,
    road: 0.2
  };
  
  const overallScore = calculateWeightedScore(
    { grocery: groceryScore, emergency: emergencyScore, road: roadScore },
    weights
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
 * Cluster locations into hotspots
 * Custom implementation for clustering
 * @param {Array} locations - Scored locations
 * @param {number} clusterRadius - Radius to consider as same hotspot
 * @returns {Array} - Array of hotspots
 */
const clusterHotspots = (locations, clusterRadius = 500) => {
  const hotspots = [];
  
  // Sort locations by overall score (descending)
  const sortedLocations = [...locations].sort((a, b) => b.scores.overall - a.scores.overall);
  
  // Take top 50% of scored locations for clustering
  const topLocations = sortedLocations.slice(0, Math.ceil(sortedLocations.length / 2));
  
  for (const location of topLocations) {
    // Check if location is already within an existing hotspot
    const isInExistingHotspot = hotspots.some(hotspot => {
      const distance = calculateHaversineDistance(
        { lat: location.lat, lng: location.lng },
        { lat: hotspot.center.lat, lng: hotspot.center.lng }
      );
      return distance <= clusterRadius;
    });
    
    // Only create a new hotspot if it's not in an existing one and has a good score
    if (!isInExistingHotspot && location.scores.overall >= 50) {
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
  
  // Sort hotspots by score (descending) and limit to top 10
  return hotspots.sort((a, b) => b.score - a.score).slice(0, 10);
};

/**
 * Find real estate hotspots around a location using custom implementations
 * @param {Object} params - Parameters with lat, lng, and radius
 * @returns {Object} - Analysis results with hotspots ranked by score
 */
export const getCustomRealEstateHotspots = async (params) => {
  const { lat, lng, radius = 5000 } = params;
  
  // Generate grid of locations to analyze using our custom grid generator
  const grid = generateLocationGrid({ lat, lng }, radius);
  
  // Calculate scores for each location using our custom scoring function
  const scoredLocations = grid.map(location => calculateLocationScore(location));
  
  // Group locations into hotspot clusters using our custom clustering function
  const hotspots = clusterHotspots(scoredLocations);
  
  return {
    center: { lat, lng },
    radius,
    analyzed: grid.length,
    hotspots
  };
}; 