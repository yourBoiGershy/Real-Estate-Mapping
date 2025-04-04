import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getMainRoads } from '../data/dataLoader.js';

// Constants for transit stations in Ottawa
const TRANSIT_STATIONS = [
  { name: "Blair", id: "3021", lat: 45.4311, lng: -75.6002 },
  { name: "Cyrville", id: "3022", lat: 45.4208, lng: -75.6286 },
  { name: "St. Laurent", id: "3023", lat: 45.4192, lng: -75.6393 },
  { name: "Tremblay", id: "3024", lat: 45.4168, lng: -75.6499 },
  { name: "Hurdman", id: "3025", lat: 45.4119, lng: -75.6642 },
  { name: "Lees", id: "3026", lat: 45.4088, lng: -75.6750 },
  { name: "uOttawa", id: "3027", lat: 45.4225, lng: -75.6835 },
  { name: "Rideau", id: "3028", lat: 45.4260, lng: -75.6924 },
  { name: "Parliament", id: "3029", lat: 45.4219, lng: -75.7005 },
  { name: "Lyon", id: "3051", lat: 45.4175, lng: -75.7050 },
  { name: "Pimisi", id: "3052", lat: 45.4142, lng: -75.7142 },
  { name: "Bayview", id: "3053", lat: 45.4108, lng: -75.7212 },
  { name: "Tunney's Pasture", id: "3054", lat: 45.4034, lng: -75.7356 }
];

// Sample bus stop data
const BUS_STOPS = [
  { id: "1001", lat: 45.4287, lng: -75.6932, routes: ["6", "7", "12"] },
  { id: "1002", lat: 45.4179, lng: -75.7014, routes: ["2", "14"] },
  { id: "1003", lat: 45.4125, lng: -75.6650, routes: ["5", "18", "19"] },
  { id: "1004", lat: 45.3975, lng: -75.7269, routes: ["11", "16"] },
  { id: "1005", lat: 45.4223, lng: -75.6930, routes: ["1", "7", "4"] },
  { id: "1006", lat: 45.4308, lng: -75.6598, routes: ["7", "13"] },
  { id: "1007", lat: 45.4407, lng: -75.6841, routes: ["9", "12"] },
  { id: "1008", lat: 45.4089, lng: -75.7143, routes: ["3", "14"] },
  { id: "1009", lat: 45.3893, lng: -75.7106, routes: ["10", "16"] },
  { id: "1010", lat: 45.4365, lng: -75.7072, routes: ["8", "15"] }
];

/**
 * Calculate the distance to the nearest transit station from a given location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} - Distance in meters and details of the nearest station
 */
function calculateDistanceToNearestTransitStation(lat, lng) {
  let closestDistance = Infinity;
  let closestStation = null;

  for (const station of TRANSIT_STATIONS) {
    const distance = calculateHaversineDistance(
      { lat, lng },
      { lat: station.lat, lng: station.lng }
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      closestStation = station;
    }
  }

  return {
    distance: closestDistance,
    station: closestStation
  };
}

/**
 * Calculate the distance to the nearest bus stop from a given location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} - Distance in meters and details of the nearest bus stop
 */
function calculateDistanceToNearestBusStop(lat, lng) {
  let closestDistance = Infinity;
  let closestBusStop = null;

  for (const busStop of BUS_STOPS) {
    const distance = calculateHaversineDistance(
      { lat, lng },
      { lat: busStop.lat, lng: busStop.lng }
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      closestBusStop = busStop;
    }
  }

  return {
    distance: closestDistance,
    busStop: closestBusStop
  };
}

/**
 * Calculate distance from a point to a line segment (road)
 * @param {number} x - Point x (longitude)
 * @param {number} y - Point y (latitude)
 * @param {number} x1 - Line segment start x
 * @param {number} y1 - Line segment start y
 * @param {number} x2 - Line segment end x
 * @param {number} y2 - Line segment end y
 * @returns {number} - Distance in meters
 */
function calculateDistanceToLineSegment(x, y, x1, y1, x2, y2) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  // Convert to meters using Haversine
  return calculateHaversineDistance(
    { lat: y, lng: x },
    { lat: yy, lng: xx }
  );
}

/**
 * Calculate the distance to the nearest main road from a given location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} - Distance in meters and details of the nearest road
 */
function calculateDistanceToNearestMainRoad(lat, lng) {
  const mainRoads = getMainRoads();
  
  if (!mainRoads || mainRoads.length === 0) {
    console.warn('No main roads data available');
    return {
      distance: Infinity,
      road: null
    };
  }

  console.log(`Evaluating distance to ${mainRoads.length} main roads`);
  
  let closestDistance = Infinity;
  let closestRoad = null;

  for (const road of mainRoads) {
    try {
      let distance;
      
      // Check if road has start and end coordinates (line segment)
      if (road.start_lat && road.start_lng && road.end_lat && road.end_lng) {
        // Calculate distance to road segment
        distance = calculateDistanceToLineSegment(
          lng, lat,
          parseFloat(road.start_lng), parseFloat(road.start_lat),
          parseFloat(road.end_lng), parseFloat(road.end_lat)
        );
      } 
      // Check if road has single point coordinates
      else if (road.lat && road.lng) {
        // Calculate direct distance to the road point
        distance = calculateHaversineDistance(
          { lat, lng },
          { lat: parseFloat(road.lat), lng: parseFloat(road.lng) }
        );
      } else {
        console.warn(`Road ${road.name} has invalid coordinates`);
        continue;
      }
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestRoad = road;
      }
    } catch (error) {
      console.error(`Error calculating distance to road ${road.name}:`, error);
    }
  }

  if (!closestRoad) {
    console.warn('No valid road found');
    return {
      distance: Infinity,
      road: null
    };
  }

  console.log(`Closest road is ${closestRoad.name} at ${closestDistance.toFixed(2)}m`);
  
  return {
    distance: closestDistance,
    road: closestRoad
  };
}

/**
 * Calculate the mobility score for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} - Mobility score and detailed component scores
 */
export function calculateMobilityScore(location) {
  // Get distances to transit infrastructure
  const { distance: transitStationDistance, station: nearestStation } = 
    calculateDistanceToNearestTransitStation(location.lat, location.lng);
  
  const { distance: busStopDistance, busStop: nearestBusStop } = 
    calculateDistanceToNearestBusStop(location.lat, location.lng);
  
  const { distance: roadDistance, road: nearestRoad } = 
    calculateDistanceToNearestMainRoad(location.lat, location.lng);

  // Calculate individual scores
  
  // Transit station score (max score of 100 if within 300m, min score of 20 if beyond 2000m)
  const transitStationScore = transitStationDistance <= 300 ? 100 :
                             transitStationDistance >= 2000 ? 20 : 
                             Math.round(100 - ((transitStationDistance - 300) / 1700) * 80);
  
  // Bus stop score (max score of 100 if within 150m, min score of 20 if beyond 1000m)
  const busStopScore = busStopDistance <= 150 ? 100 :
                      busStopDistance >= 1000 ? 20 : 
                      Math.round(100 - ((busStopDistance - 150) / 850) * 80);
  
  // Road access score (max score of 100 if within 200m, min score of 20 if beyond 1500m)
  const roadAccessScore = roadDistance <= 200 ? 100 :
                         roadDistance >= 1500 ? 20 : 
                         Math.round(100 - ((roadDistance - 200) / 1300) * 80);
  
  // Calculate overall mobility score (weighted average)
  // Transit stations have highest weight, followed by bus stops and road access
  const overallMobilityScore = Math.round(
    (transitStationScore * 0.45) + 
    (busStopScore * 0.35) + 
    (roadAccessScore * 0.2)
  );

  // Prepare the transit station result format
  const nearestTransitStation = nearestStation ? {
    name: nearestStation.name,
    id: nearestStation.id,
    distance: transitStationDistance
  } : null;

  // Prepare the bus stop result format
  const nearestBusStopResult = nearestBusStop ? {
    id: nearestBusStop.id,
    distance: busStopDistance,
    routes: nearestBusStop.routes
  } : null;

  // Prepare the road result format
  const nearestMainRoad = nearestRoad ? {
    name: nearestRoad.name,
    distance: roadDistance
  } : null;

  return {
    score: overallMobilityScore,
    transitStationScore,
    busStopScore,
    roadAccessScore,
    nearestTransitStation,
    nearestBusStop: nearestBusStopResult,
    nearestMainRoad
  };
}

export default {
  calculateMobilityScore
}; 