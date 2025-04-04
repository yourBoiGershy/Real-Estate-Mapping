import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getGroceryStores } from '../data/dataLoader.js';

/**
 * Calculate the grocery score for a location
 * @param {Object} location - Location with lat and lng properties
 * @returns {Object} - Grocery score and details
 */
export function calculateGroceryScore(location) {
  // Get grocery stores data
  const groceryStores = getGroceryStores();
  
  if (!groceryStores || groceryStores.length === 0) {
    console.warn('No grocery stores data available');
    return {
      score: 0,
      stores: []
    };
  }

  console.log(`Evaluating distance to ${groceryStores.length} grocery stores`);
  
  // Calculate distance to each grocery store
  const storesWithDistances = groceryStores.map(store => {
    try {
      const distance = calculateHaversineDistance(
        { lat: location.lat, lng: location.lng },
        { lat: parseFloat(store.lat), lng: parseFloat(store.lng) }
      );
      
      return {
        ...store,
        distance
      };
    } catch (error) {
      console.error(`Error calculating distance to store ${store.name}:`, error);
      return {
        ...store,
        distance: Infinity
      };
    }
  });

  // Sort by distance
  storesWithDistances.sort((a, b) => a.distance - b.distance);

  // Calculate score based on proximity to grocery stores
  let groceryScore = 0;
  const nearestStore = storesWithDistances[0];
  
  if (nearestStore) {
    console.log(`Nearest grocery store: ${nearestStore.name} at ${nearestStore.distance.toFixed(2)}m`);
    
    if (nearestStore.distance <= 500) {
      groceryScore = 100; // Max score within 500m
    } else if (nearestStore.distance >= 5000) {
      groceryScore = 20; // Min score beyond 5km
    } else {
      // Linear scale between 500m and 5km
      groceryScore = Math.round(100 - ((nearestStore.distance - 500) / 4500) * 80);
    }
  }

  // Get nearest 5 grocery stores for display
  const nearbyStores = storesWithDistances.slice(0, 5);

  return {
    score: groceryScore,
    stores: nearbyStores,
    nearestStore
  };
}

export default {
  calculateGroceryScore
}; 