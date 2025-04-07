import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getMainRoads } from '../data/dataLoader.js';
import { calculateWalkingTime, initializeRoadGraph } from './routingAnalysis.js';

// Transit station data
const TRANSIT_STATIONS = [
  { name: "Airport", id: "3039", lat: 45.3229, lng: -75.6694 },
  { name: "Barrhaven Centre", id: "3045", lat: 45.2756, lng: -75.7367 },
  { name: "Baseline", id: "3017", lat: 45.3551, lng: -75.7918 },
  { name: "Bayshore", id: "3050", lat: 45.3478, lng: -75.8088 },
  { name: "Bayview", id: "3060", lat: 45.4114, lng: -75.7341 },
  { name: "Beatrice", id: "3049", lat: 45.3747, lng: -75.7776 },
  { name: "Billings Bridge", id: "3034", lat: 45.3840, lng: -75.6775 },
  { name: "Blair", id: "3027", lat: 45.4312, lng: -75.6011 },
  { name: "Canadian Tire Centre", id: "3059", lat: 45.2969, lng: -75.9269 },
  { name: "Carleton", id: "3062", lat: 45.3832, lng: -75.6976 },
  { name: "Carling", id: "3061", lat: 45.3848, lng: -75.7600 },
  { name: "Chapel Hill", id: "3074", lat: 45.4798, lng: -75.5124 },
  { name: "Cyrville", id: "3026", lat: 45.4213, lng: -75.6281 },
  { name: "Dominion", id: "3013", lat: 45.3989, lng: -75.7536 },
  { name: "Eagleson", id: "3055", lat: 45.3461, lng: -75.8351 },
  { name: "Fallowfield - VIA Rail", id: "3043", lat: 45.2929, lng: -75.7120 },
  { name: "Greenboro", id: "3037", lat: 45.3336, lng: -75.6264 },
  { name: "Heron", id: "3035", lat: 45.3784, lng: -75.6685 },
  { name: "Hurdman", id: "3023", lat: 45.4112, lng: -75.6651 },
  { name: "Innovation", id: "3057", lat: 45.3444, lng: -75.9172 },
  { name: "Iris", id: "3016", lat: 45.3597, lng: -75.7611 },
  { name: "Jeanne d'Arc", id: "3070", lat: 45.4576, lng: -75.5399 },
  { name: "Lees", id: "3022", lat: 45.4118, lng: -75.6671 },
  { name: "Leitrim", id: "3041", lat: 45.2992, lng: -75.5988 },
  { name: "Lincoln Fields", id: "3014", lat: 45.3692, lng: -75.7614 },
  { name: "Longfields", id: "3046", lat: 45.2692, lng: -75.7423 },
  { name: "Lycée Claudel", id: "3030", lat: 45.4085, lng: -75.6462 },
  { name: "Lyon", id: "3051", lat: 45.4175, lng: -75.7017 },
  { name: "Marketplace", id: "3047", lat: 45.2711, lng: -75.7496 },
  { name: "Millennium", id: "3076", lat: 45.4621, lng: -75.5114 },
  { name: "Moodie", id: "3042", lat: 45.3418, lng: -75.8532 },
  { name: "Mooney's Bay", id: "3063", lat: 45.3661, lng: -75.6913 },
  { name: "Nepean Woods", id: "3048", lat: 45.2679, lng: -75.7537 },
  { name: "Parliament", id: "3052", lat: 45.4215, lng: -75.6972 },
  { name: "Pimisi", id: "3010", lat: 45.4142, lng: -75.7123 },
  { name: "Pinecrest", id: "3019", lat: 45.3625, lng: -75.7810 },
  { name: "Place d'Orléans", id: "3028", lat: 45.4761, lng: -75.5199 },
  { name: "Place d'Orléans Park & Ride", id: "3075", lat: 45.4761, lng: -75.5199 },
  { name: "Pleasant Park", id: "3033", lat: 45.3994, lng: -75.6634 },
  { name: "Queensway", id: "3015", lat: 45.3948, lng: -75.7673 },
  { name: "Rideau", id: "3009", lat: 45.4248, lng: -75.6925 },
  { name: "Riverside", id: "3032", lat: 45.3841, lng: -75.6690 },
  { name: "Riverview", id: "3040", lat: 45.3280, lng: -75.6962 },
  { name: "Smyth", id: "3031", lat: 45.4022, lng: -75.6464 },
  { name: "South Keys", id: "3038", lat: 45.3600, lng: -75.6664 },
  { name: "St-Laurent", id: "3025", lat: 45.4187, lng: -75.6393 },
  { name: "Strandherd", id: "3044", lat: 45.2750, lng: -75.7414 },
  { name: "Teron", id: "3018", lat: 45.3461, lng: -75.9194 },
  { name: "Terry Fox", id: "3058", lat: 45.3456, lng: -75.9194 },
  { name: "Tremblay - VIA Rail", id: "3024", lat: 45.4160, lng: -75.6505 },
  { name: "Trim", id: "3029", lat: 45.4819, lng: -75.5083 },
  { name: "Tunney's Pasture", id: "3011", lat: 45.4029, lng: -75.7359 },
  { name: "uOttawa", id: "3021", lat: 45.4225, lng: -75.6841 },
  { name: "Walkley", id: "3036", lat: 45.3704, lng: -75.6251 },
  { name: "Westboro", id: "3012", lat: 45.3938, lng: -75.7502 }
];

// Regular bus stop data (would normally be loaded from CSV)
// In a real implementation, this would be loaded from a comprehensive data file
const BUS_STOPS = [
  // This is a simplified subset for demonstration
  // In a real implementation, these would be imported from a larger dataset
  { id: "1001", lat: 45.4196, lng: -75.6963, routes: ["1", "7"] },
  { id: "1002", lat: 45.4173, lng: -75.7014, routes: ["2", "14"] },
  { id: "1003", lat: 45.4146, lng: -75.6945, routes: ["4", "9", "11"] },
  { id: "1004", lat: 45.4290, lng: -75.6798, routes: ["6", "7", "18"] },
  { id: "1005", lat: 45.4210, lng: -75.6885, routes: ["5", "8", "16"] },
  // Sample stops in other areas of Ottawa
  { id: "2001", lat: 45.3550, lng: -75.8025, routes: ["61", "62", "63"] },  // Kanata
  { id: "2002", lat: 45.3461, lng: -75.8351, routes: ["62", "64"] },        // Kanata
  { id: "3001", lat: 45.4738, lng: -75.5185, routes: ["30", "31", "32"] },  // Orleans
  { id: "3002", lat: 45.4607, lng: -75.5150, routes: ["34", "35"] },        // Orleans
  { id: "4001", lat: 45.2756, lng: -75.7367, routes: ["70", "71", "73"] },  // Barrhaven
  { id: "4002", lat: 45.2711, lng: -75.7496, routes: ["74", "75"] }         // Barrhaven
];

/**
 * Calculate distance and walking time to the nearest transit station
 * @param {Object} location - Location with lat and lng
 * @returns {Object} - Distance, walking time, and nearest station info
 */
const calculateDistanceToNearestStation = (location) => {
  if (!TRANSIT_STATIONS || TRANSIT_STATIONS.length === 0) {
    return { distance: Infinity, walkingTime: null, station: null };
  }

  let nearestStation = null;
  let minDistance = Infinity;
  let walkingTimeInfo = null;

  for (const station of TRANSIT_STATIONS) {
    const distance = calculateHaversineDistance(
      { lat: location.lat, lng: location.lng },
      { lat: station.lat, lng: station.lng }
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station;

      // Calculate walking time to this station
      walkingTimeInfo = calculateWalkingTime(
        { lat: location.lat, lng: location.lng },
        { lat: station.lat, lng: station.lng }
      );
    }
  }

  return {
    distance: minDistance,
    walkingTime: walkingTimeInfo,
    station: nearestStation
  };
};

/**
 * Calculate distance and walking time to the nearest bus stop
 * @param {Object} location - Location with lat and lng
 * @returns {Object} - Distance, walking time, and nearest bus stop info
 */
const calculateDistanceToNearestBusStop = (location) => {
  if (!BUS_STOPS || BUS_STOPS.length === 0) {
    return { distance: Infinity, walkingTime: null, busStop: null };
  }

  let nearestBusStop = null;
  let minDistance = Infinity;
  let walkingTimeInfo = null;

  for (const busStop of BUS_STOPS) {
    const distance = calculateHaversineDistance(
      { lat: location.lat, lng: location.lng },
      { lat: busStop.lat, lng: busStop.lng }
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestBusStop = busStop;

      // Calculate walking time to this bus stop
      walkingTimeInfo = calculateWalkingTime(
        { lat: location.lat, lng: location.lng },
        { lat: busStop.lat, lng: busStop.lng }
      );
    }
  }

  return {
    distance: minDistance,
    walkingTime: walkingTimeInfo,
    busStop: nearestBusStop
  };
};

/**
 * Calculate distance to the nearest main road
 * @param {Object} location - Location with lat and lng
 * @returns {Object} - Distance and nearest road info
 */
const calculateDistanceToNearestRoad = (location) => {
  const mainRoads = getMainRoads();

  if (!mainRoads || mainRoads.length === 0) {
    return { distance: Infinity, road: null };
  }

  let nearestRoad = null;
  let minDistance = Infinity;
  let nearestPoint = null;

  for (const road of mainRoads) {
    // Calculate distance to line segment
    const startPoint = { lat: parseFloat(road.start_lat), lng: parseFloat(road.start_lng) };
    const endPoint = { lat: parseFloat(road.end_lat), lng: parseFloat(road.end_lng) };

    const distance = calculateDistanceToLineSegment(
      { lat: location.lat, lng: location.lng },
      startPoint,
      endPoint
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestRoad = road;

      // Find the nearest point on the road segment
      // This is a simplified calculation to find the projection point
      const x = location.lat;
      const y = location.lng;
      const x1 = startPoint.lat;
      const y1 = startPoint.lng;
      const x2 = endPoint.lat;
      const y2 = endPoint.lng;

      // Calculate squared length of line segment
      const lengthSquared = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);

      // If line segment is actually a point, use that point
      if (lengthSquared === 0) {
        nearestPoint = startPoint;
      } else {
        // Calculate projection of point onto line segment
        const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared));

        // Calculate closest point on line segment
        nearestPoint = {
          lat: x1 + t * (x2 - x1),
          lng: y1 + t * (y2 - y1)
        };
      }
    }
  }

  // Calculate walking time to the nearest point on the road
  const walkingTimeInfo = nearestPoint ? calculateWalkingTime(
    { lat: location.lat, lng: location.lng },
    nearestPoint
  ) : null;

  return {
    distance: minDistance,
    walkingTime: walkingTimeInfo,
    road: nearestRoad
  };
};

/**
 * Calculate the distance from a point to a line segment
 * @param {Object} point - Point with lat and lng
 * @param {Object} start - Start point of line with lat and lng
 * @param {Object} end - End point of line with lat and lng
 * @returns {number} - Distance in meters
 */
const calculateDistanceToLineSegment = (point, start, end) => {
  // Convert to Cartesian coordinates for simplicity
  // This is a simplification and works best for small distances
  const earthRadiusM = 6371000;

  // Convert lat/lng to radians
  const startLat = start.lat * Math.PI / 180;
  const startLng = start.lng * Math.PI / 180;
  const endLat = end.lat * Math.PI / 180;
  const endLng = end.lng * Math.PI / 180;
  const pointLat = point.lat * Math.PI / 180;
  const pointLng = point.lng * Math.PI / 180;

  // Convert to x, y coordinates (simplified for small distances)
  const x1 = earthRadiusM * Math.cos(startLat) * Math.cos(startLng);
  const y1 = earthRadiusM * Math.cos(startLat) * Math.sin(startLng);
  const z1 = earthRadiusM * Math.sin(startLat);

  const x2 = earthRadiusM * Math.cos(endLat) * Math.cos(endLng);
  const y2 = earthRadiusM * Math.cos(endLat) * Math.sin(endLng);
  const z2 = earthRadiusM * Math.sin(endLat);

  const x0 = earthRadiusM * Math.cos(pointLat) * Math.cos(pointLng);
  const y0 = earthRadiusM * Math.cos(pointLat) * Math.sin(pointLng);
  const z0 = earthRadiusM * Math.sin(pointLat);

  // Line segment vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;

  // Length squared of line segment
  const lengthSquared = dx * dx + dy * dy + dz * dz;

  if (lengthSquared === 0) {
    // Start and end points are the same
    return Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1) + (z0 - z1) * (z0 - z1));
  }

  // Calculate projection
  const t = ((x0 - x1) * dx + (y0 - y1) * dy + (z0 - z1) * dz) / lengthSquared;

  if (t < 0) {
    // Beyond the start point
    return Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1) + (z0 - z1) * (z0 - z1));
  }

  if (t > 1) {
    // Beyond the end point
    return Math.sqrt((x0 - x2) * (x0 - x2) + (y0 - y2) * (y0 - y2) + (z0 - z2) * (z0 - z2));
  }

  // Projection point on line
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const projZ = z1 + t * dz;

  // Distance from point to projection
  return Math.sqrt((x0 - projX) * (x0 - projX) + (y0 - projY) * (y0 - projY) + (z0 - projZ) * (z0 - projZ));
};

/**
 * Initialize the road network graph
 * This should be called when the application starts
 */
export const initializeMobilityAnalysis = () => {
  console.log('Initializing mobility analysis and road network graph...');
  initializeRoadGraph();
};

/**
 * Calculate mobility score for a location
 * @param {Object} location - Location with lat and lng
 * @returns {Object} - Mobility scores and details
 */
export const calculateMobilityScore = (location) => {
  // Calculate distances and walking times
  const stationInfo = calculateDistanceToNearestStation(location);
  const busStopInfo = calculateDistanceToNearestBusStop(location);
  const roadInfo = calculateDistanceToNearestRoad(location);

  // Calculate individual scores

  // Transit station score (max 100 if within 300m, 0 if beyond 3km)
  let stationScore = 0;
  if (stationInfo.distance <= 300) {
    stationScore = 100;
  } else if (stationInfo.distance >= 3000) {
    stationScore = 0;
  } else {
    stationScore = Math.round(100 - ((stationInfo.distance - 300) / 2700) * 100);
  }

  // Bus stop score (max 100 if within 150m, 0 if beyond 1km)
  let busStopScore = 0;
  if (busStopInfo.distance <= 150) {
    busStopScore = 100;
  } else if (busStopInfo.distance >= 1000) {
    busStopScore = 0;
  } else {
    busStopScore = Math.round(100 - ((busStopInfo.distance - 150) / 850) * 100);
  }

  // Main road score (max 100 if within 200m, 0 if beyond 2km)
  let roadScore = 0;
  if (roadInfo.distance <= 200) {
    roadScore = 100;
  } else if (roadInfo.distance >= 2000) {
    roadScore = 0;
  } else {
    roadScore = Math.round(100 - ((roadInfo.distance - 200) / 1800) * 100);
  }

  // Calculate weighted overall mobility score
  // Weights can be adjusted based on importance of each factor
  const weights = {
    station: 0.5,   // O-Train stations are most important
    busStop: 0.3,   // Regular bus stops
    road: 0.2       // Road access
  };

  const overallScore = Math.round(
    stationScore * weights.station +
    busStopScore * weights.busStop +
    roadScore * weights.road
  );

  return {
    overallScore,
    details: {
      station: {
        score: stationScore,
        distance: Math.round(stationInfo.distance),
        walkingTime: stationInfo.walkingTime ? {
          minutes: stationInfo.walkingTime.minutes,
          isEstimate: stationInfo.walkingTime.isEstimate
        } : null,
        nearest: stationInfo.station ? {
          name: stationInfo.station.name,
          id: stationInfo.station.id
        } : null
      },
      busStop: {
        score: busStopScore,
        distance: Math.round(busStopInfo.distance),
        walkingTime: busStopInfo.walkingTime ? {
          minutes: busStopInfo.walkingTime.minutes,
          isEstimate: busStopInfo.walkingTime.isEstimate
        } : null,
        nearest: busStopInfo.busStop ? {
          id: busStopInfo.busStop.id,
          routes: busStopInfo.busStop.routes
        } : null
      },
      road: {
        score: roadScore,
        distance: Math.round(roadInfo.distance),
        walkingTime: roadInfo.walkingTime ? {
          minutes: roadInfo.walkingTime.minutes,
          isEstimate: roadInfo.walkingTime.isEstimate
        } : null,
        nearest: roadInfo.road ? {
          name: roadInfo.road.name
        } : null
      }
    }
  };
};