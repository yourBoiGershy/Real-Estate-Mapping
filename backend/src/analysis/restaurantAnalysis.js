import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getRestaurants } from '../data/dataLoader.js';

/**
 * Calculate restaurant score for a given location
 * @param {Object} coordinates - Location coordinates {lat, lng}
 * @returns {Object} - Restaurant score and nearby restaurants
 */
export const calculateRestaurantScore = (coordinates) => {
  const { lat, lng } = coordinates;
  const restaurants = getRestaurants();
  
  if (!restaurants || restaurants.length === 0) {
    console.warn('No restaurant data available');
    return {
      score: 0,
      restaurants: []
    };
  }
  
  console.log(`Calculating restaurant score for ${lat}, ${lng} with ${restaurants.length} restaurants`);
  
  // Calculate distance to each restaurant
  const restaurantsWithDistance = restaurants.map(restaurant => {
    try {
      const distance = calculateHaversineDistance(
        { lat, lng },
        { lat: restaurant.lat, lng: restaurant.lng }
      );
      
      return {
        ...restaurant,
        distance: Math.round(distance)
      };
    } catch (error) {
      console.error(`Error calculating distance to restaurant ${restaurant.name}:`, error);
      return {
        ...restaurant,
        distance: Infinity
      };
    }
  });
  
  // Sort restaurants by distance
  const sortedRestaurants = restaurantsWithDistance
    .sort((a, b) => a.distance - b.distance);
  
  // Get top 10 nearest restaurants
  const nearestRestaurants = sortedRestaurants.slice(0, 10);
  
  // Find the nearest restaurant
  const nearestRestaurant = nearestRestaurants.length > 0 ? nearestRestaurants[0] : null;
  
  // Calculate restaurant score based on:
  // 1. Proximity (nearest restaurant)
  // 2. Variety (number of restaurants within 2km)
  // 3. Quality (average rating of nearby restaurants)
  
  // Proximity score (0-40 points)
  let proximityScore = 0;
  if (nearestRestaurant) {
    if (nearestRestaurant.distance <= 250) {
      proximityScore = 40;
    } else if (nearestRestaurant.distance <= 500) {
      proximityScore = 35;
    } else if (nearestRestaurant.distance <= 1000) {
      proximityScore = 30;
    } else if (nearestRestaurant.distance <= 1500) {
      proximityScore = 20;
    } else if (nearestRestaurant.distance <= 2000) {
      proximityScore = 10;
    } else {
      proximityScore = 5;
    }
  }
  
  // Variety score (0-30 points)
  const restaurantsWithin2km = sortedRestaurants.filter(r => r.distance <= 2000);
  let varietyScore = 0;
  
  if (restaurantsWithin2km.length >= 20) {
    varietyScore = 30;
  } else if (restaurantsWithin2km.length >= 15) {
    varietyScore = 25;
  } else if (restaurantsWithin2km.length >= 10) {
    varietyScore = 20;
  } else if (restaurantsWithin2km.length >= 5) {
    varietyScore = 15;
  } else if (restaurantsWithin2km.length >= 3) {
    varietyScore = 10;
  } else if (restaurantsWithin2km.length >= 1) {
    varietyScore = 5;
  }
  
  // Quality score (0-30 points)
  let qualityScore = 0;
  if (restaurantsWithin2km.length > 0) {
    const avgRating = restaurantsWithin2km.reduce((sum, r) => sum + r.rating, 0) / restaurantsWithin2km.length;
    
    if (avgRating >= 4.5) {
      qualityScore = 30;
    } else if (avgRating >= 4.2) {
      qualityScore = 25;
    } else if (avgRating >= 4.0) {
      qualityScore = 20;
    } else if (avgRating >= 3.8) {
      qualityScore = 15;
    } else if (avgRating >= 3.5) {
      qualityScore = 10;
    } else {
      qualityScore = 5;
    }
  }
  
  // Calculate total score
  const totalScore = Math.min(proximityScore + varietyScore + qualityScore, 100);
  
  return {
    score: totalScore,
    restaurants: nearestRestaurants,
    nearestRestaurant,
    restaurantsWithin2km: restaurantsWithin2km.length
  };
}; 