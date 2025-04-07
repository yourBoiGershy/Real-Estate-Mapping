/**
 * Driving analysis module for calculating driving paths and times
 * Implements a simplified model for estimating driving times
 */

import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getMainRoads } from '../data/dataLoader.js';

// Average driving speeds in meters per second for different road types
const DRIVING_SPEEDS = {
  highway: 27.8, // 100 km/h = 27.8 m/s
  major: 16.7,   // 60 km/h = 16.7 m/s
  minor: 11.1,   // 40 km/h = 11.1 m/s
  default: 13.9  // 50 km/h = 13.9 m/s
};

// Traffic congestion factors (multipliers)
const TRAFFIC_FACTORS = {
  low: 1.0,      // No congestion
  medium: 1.3,   // Moderate congestion
  high: 1.8      // Heavy congestion
};

/**
 * Calculate driving time between two locations
 * @param {Object} startLocation - Starting location with lat and lng
 * @param {Object} endLocation - Ending location with lat and lng
 * @param {string} trafficLevel - Traffic level: 'low', 'medium', or 'high'
 * @returns {Object} - Driving time in minutes and distance in meters
 */
export const calculateDrivingTime = (startLocation, endLocation, trafficLevel = 'medium') => {
  // Calculate direct distance
  const directDistance = calculateHaversineDistance(startLocation, endLocation);
  
  // Get traffic factor
  const trafficFactor = TRAFFIC_FACTORS[trafficLevel] || TRAFFIC_FACTORS.medium;
  
  // Determine road type based on distance (simplified model)
  let roadType = 'minor';
  if (directDistance > 10000) {
    roadType = 'highway';
  } else if (directDistance > 3000) {
    roadType = 'major';
  }
  
  // Calculate driving speed
  const drivingSpeed = DRIVING_SPEEDS[roadType] || DRIVING_SPEEDS.default;
  
  // Calculate driving time with traffic factor
  const drivingTimeSeconds = (directDistance / drivingSpeed) * trafficFactor;
  
  // Add time for intersections and traffic lights (simplified model)
  // Assume one traffic light or intersection every 500m on average
  const intersections = Math.floor(directDistance / 500);
  const intersectionDelay = intersections * 20; // 20 seconds per intersection on average
  
  // Total driving time in seconds
  const totalDrivingTimeSeconds = drivingTimeSeconds + intersectionDelay;
  
  // Convert to minutes
  const drivingTimeMinutes = Math.round(totalDrivingTimeSeconds / 60);
  
  return {
    minutes: drivingTimeMinutes,
    distance: Math.round(directDistance),
    roadType: roadType,
    trafficLevel: trafficLevel
  };
};

/**
 * Calculate emergency response time
 * This uses a different model than regular driving time
 * Emergency vehicles can move faster and have priority at intersections
 * @param {Object} serviceLocation - Service location with lat and lng
 * @param {Object} targetLocation - Target location with lat and lng
 * @param {string} serviceType - Type of emergency service: 'hospital', 'fire', 'police'
 * @returns {Object} - Response time in minutes and distance in meters
 */
export const calculateEmergencyResponseTime = (serviceLocation, targetLocation, serviceType) => {
  // Calculate direct distance
  const directDistance = calculateHaversineDistance(serviceLocation, targetLocation);
  
  // Different response speeds for different service types
  const responseSpeedFactors = {
    hospital: 0.9,  // Ambulances are slightly slower than fire trucks
    fire: 0.85,     // Fire trucks are slightly slower than police
    police: 0.8,    // Police are fastest
    default: 0.9
  };
  
  // Get response factor
  const responseFactor = responseSpeedFactors[serviceType] || responseSpeedFactors.default;
  
  // Calculate base driving time (faster than regular traffic)
  // Emergency vehicles can travel at higher speeds and have priority
  const baseResponseTimeSeconds = directDistance / (DRIVING_SPEEDS.major * 1.2);
  
  // Apply service-specific factor
  const adjustedResponseTimeSeconds = baseResponseTimeSeconds * responseFactor;
  
  // Add reduced time for intersections (emergency vehicles have priority)
  const intersections = Math.floor(directDistance / 500);
  const intersectionDelay = intersections * 5; // Only 5 seconds per intersection for emergency vehicles
  
  // Total response time in seconds
  const totalResponseTimeSeconds = adjustedResponseTimeSeconds + intersectionDelay;
  
  // Add preparation time (different for each service type)
  const preparationTimes = {
    hospital: 60,   // 1 minute for ambulance to get ready
    fire: 90,       // 1.5 minutes for fire truck to get ready
    police: 30,     // 30 seconds for police to get ready
    default: 60
  };
  
  const preparationTime = preparationTimes[serviceType] || preparationTimes.default;
  const finalResponseTimeSeconds = totalResponseTimeSeconds + preparationTime;
  
  // Convert to minutes
  const responseTimeMinutes = Math.round(finalResponseTimeSeconds / 60);
  
  return {
    minutes: responseTimeMinutes,
    distance: Math.round(directDistance),
    serviceType: serviceType
  };
};
