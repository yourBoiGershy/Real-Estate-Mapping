/**
 * Custom implementation of geographic calculations for real estate analysis
 * These functions provide custom implementations rather than just using existing GIS libraries
 */

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 */
export const degreesToRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} - Angle in degrees
 */
export const radiansToDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Calculate the Haversine distance between two points on Earth
 * Custom implementation of the Haversine formula
 * @param {Object} point1 - First point with lat and lng
 * @param {Object} point2 - Second point with lat and lng
 * @returns {number} - Distance in meters
 */
export const calculateHaversineDistance = (point1, point2) => {
  // Convert latitude and longitude from degrees to radians
  const lat1 = degreesToRadians(point1.lat);
  const lon1 = degreesToRadians(point1.lng);
  const lat2 = degreesToRadians(point2.lat);
  const lon2 = degreesToRadians(point2.lng);
  
  // Haversine formula
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance in meters
  const distance = EARTH_RADIUS * c;
  
  return distance;
};

/**
 * Calculate the closest distance from a point to a line segment
 * Custom implementation for finding distance to roads
 * @param {Object} point - The point with lat and lng
 * @param {Object} lineStart - Start point of the line with lat and lng
 * @param {Object} lineEnd - End point of the line with lat and lng
 * @returns {number} - Distance in meters
 */
export const calculateDistanceToLineSegment = (point, lineStart, lineEnd) => {
  // Convert to a simpler coordinate system for easier calculation
  // We use a flat projection which is good enough for small distances
  
  // First calculate the point-to-line distance
  const x = point.lat;
  const y = point.lng;
  const x1 = lineStart.lat;
  const y1 = lineStart.lng;
  const x2 = lineEnd.lat;
  const y2 = lineEnd.lng;
  
  // Calculate squared length of line segment
  const lengthSquared = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
  
  // If line segment is actually a point, just calculate point-to-point distance
  if (lengthSquared === 0) {
    return calculateHaversineDistance(point, lineStart);
  }
  
  // Calculate projection of point onto line segment
  const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared));
  
  // Calculate closest point on line segment
  const projectionLat = x1 + t * (x2 - x1);
  const projectionLng = y1 + t * (y2 - y1);
  
  // Return the distance to this point
  return calculateHaversineDistance(point, { lat: projectionLat, lng: projectionLng });
};

/**
 * Calculate bounds of a circle around a center point
 * Custom implementation for calculating boundaries
 * @param {Object} center - Center point with lat and lng
 * @param {number} radiusInMeters - Radius in meters
 * @returns {Object} - Boundaries in format {minLat, maxLat, minLng, maxLng}
 */
export const calculateCircleBounds = (center, radiusInMeters) => {
  // Convert latitude and longitude from degrees to radians
  const lat = degreesToRadians(center.lat);
  const lng = degreesToRadians(center.lng);
  
  // Angular distance in radians on a great circle
  const angularDistance = radiusInMeters / EARTH_RADIUS;
  
  // Calculate latitude bounds
  const minLat = lat - angularDistance;
  const maxLat = lat + angularDistance;
  
  // Calculate longitude bounds
  // These differ based on latitude 
  const maxLng = lng + angularDistance / Math.cos(lat);
  const minLng = lng - angularDistance / Math.cos(lat);
  
  // Convert back to degrees
  return {
    minLat: radiansToDegrees(minLat),
    maxLat: radiansToDegrees(maxLat),
    minLng: radiansToDegrees(minLng),
    maxLng: radiansToDegrees(maxLng)
  };
};

/**
 * Generate a grid of locations within a circle
 * Custom implementation for generating a grid
 * @param {Object} center - Center point with lat and lng
 * @param {number} radiusInMeters - Radius in meters
 * @param {number} stepInMeters - Distance between grid points in meters
 * @returns {Array} - Array of locations
 */
export const generateLocationGrid = (center, radiusInMeters, stepInMeters = 500) => {
  const locations = [];
  
  // Calculate approximate degree steps
  // 111,111 meters per degree of latitude is a reasonable approximation
  const latStep = stepInMeters / 111111;
  
  // Calculate circle bounds
  const bounds = calculateCircleBounds(center, radiusInMeters);
  
  // Generate grid within bounds
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    // Longitude step varies with latitude due to the Earth's curvature
    // cos(latitude) gives the ratio of distance per degree of longitude at this latitude
    const lngStep = latStep / Math.cos(degreesToRadians(lat));
    
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      // Check if point is within specified radius from center
      const distance = calculateHaversineDistance(center, { lat, lng });
      
      if (distance <= radiusInMeters) {
        locations.push({ lat, lng });
      }
    }
  }
  
  return locations;
};

/**
 * Calculate weighted average of scores
 * @param {Object} scores - Object with scores
 * @param {Object} weights - Object with weights
 * @returns {number} - Weighted average score
 */
export const calculateWeightedScore = (scores, weights) => {
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [key, score] of Object.entries(scores)) {
    const weight = weights[key] || 0;
    totalScore += score * weight;
    totalWeight += weight;
  }
  
  if (totalWeight === 0) {
    return 0;
  }
  
  return Math.round(totalScore / totalWeight);
};

/**
 * Calculate the bearing (direction) between two points
 * @param {Object} from - Starting point with lat and lng
 * @param {Object} to - Ending point with lat and lng
 * @returns {number} - Bearing in degrees (0-360)
 */
export const calculateBearing = (from, to) => {
  // Convert latitude and longitude from degrees to radians
  const startLat = from.lat * Math.PI / 180;
  const startLng = from.lng * Math.PI / 180;
  const destLat = to.lat * Math.PI / 180;
  const destLng = to.lng * Math.PI / 180;
  
  // Calculate bearing
  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x = Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  
  // Normalize to 0-360
  bearing = (bearing + 360) % 360;
  
  return bearing;
};

/**
 * Calculate a destination point given a starting point, distance, and bearing
 * @param {Object} start - Starting point with lat and lng
 * @param {number} distance - Distance in meters
 * @param {number} bearing - Bearing in degrees
 * @returns {Object} - Destination point with lat and lng
 */
export const calculateDestinationPoint = (start, distance, bearing) => {
  // Earth's radius in meters
  const earthRadius = 6371000;
  
  // Convert to radians
  const startLat = start.lat * Math.PI / 180;
  const startLng = start.lng * Math.PI / 180;
  const bearingRad = bearing * Math.PI / 180;
  
  // Calculate angular distance
  const angularDistance = distance / earthRadius;
  
  // Calculate destination
  const destLat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance) +
    Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  
  const destLng = startLng + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(startLat),
    Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(destLat)
  );
  
  // Convert back to degrees
  return {
    lat: destLat * 180 / Math.PI,
    lng: ((destLng * 180 / Math.PI) + 540) % 360 - 180 // Normalize to -180 to +180
  };
};

/**
 * Calculate the area of a polygon using the Shoelace formula
 * @param {Array} points - Array of points with lat and lng
 * @returns {number} - Area in square meters
 */
export const calculatePolygonArea = (points) => {
  if (points.length < 3) {
    return 0;
  }
  
  // Convert to Cartesian coordinates (approximate for small areas)
  const earthRadius = 6371000;
  const cartesian = points.map(point => {
    const lat = point.lat * Math.PI / 180;
    const lng = point.lng * Math.PI / 180;
    const x = earthRadius * Math.cos(lat) * Math.cos(lng);
    const y = earthRadius * Math.cos(lat) * Math.sin(lng);
    return { x, y };
  });
  
  // Apply Shoelace formula
  let area = 0;
  for (let i = 0, j = cartesian.length - 1; i < cartesian.length; j = i++) {
    area += cartesian[j].x * cartesian[i].y - cartesian[i].x * cartesian[j].y;
  }
  
  // Return absolute value of area divided by 2
  return Math.abs(area) / 2;
};

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 * @param {Object} point - Point with lat and lng
 * @param {Array} polygon - Array of points with lat and lng forming a polygon
 * @returns {boolean} - True if point is inside polygon
 */
export const isPointInPolygon = (point, polygon) => {
  if (polygon.length < 3) {
    return false;
  }
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) {
      inside = !inside;
    }
  }
  
  return inside;
}; 