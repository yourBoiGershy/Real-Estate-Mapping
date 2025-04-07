import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getAmenities, getAmenitiesByCategory, getEducation, getParks, getRestaurants, getGroceryStores } from '../data/dataLoader.js';
import { calculateWalkingTime, calculateDrivingTime } from './routingAnalysis.js';

/**
 * Calculate livability score for a location based on nearby amenities
 * @param {Object} coordinates - Location coordinates {lat, lng}
 * @returns {Object} - Livability score and details
 */
export const getLivabilityScore = (coordinates) => {
  const { lat, lng } = coordinates;

  // Categories to consider for livability (now includes grocery and restaurant)
  const categories = [
    'restaurant',
    'entertainment',
    'park',
    'school',
    'grocery'
  ];

  // Track scores for each category
  const scores = {};
  const categoryPlaces = {};

  // Process each category
  for (const category of categories) {
    // Get places for this category
    let places = [];

    if (category === 'school') {
      // For schools, combine regular amenities with education data
      const schoolMap = new Map(); // To avoid duplicates

      // Process regular schools first
      const schoolAmenities = getAmenitiesByCategory('school');
      for (const school of schoolAmenities) {
        const key = `${school.name}-${school.address}`.toLowerCase();
        if (!schoolMap.has(key)) {
          schoolMap.set(key, school);
        }
      }

      // Add education data (avoiding duplicates)
      const educationData = getEducation();
      for (const school of educationData) {
        const key = `${school.name}-${school.address}`.toLowerCase();
        if (!schoolMap.has(key)) {
          schoolMap.set(key, school);
        }
      }

      // Convert map values to array
      places = Array.from(schoolMap.values());

      // Categorize schools by type
      const universities = places.filter(p =>
        p.name.toLowerCase().includes('university') ||
        p.name.toLowerCase().includes('college')
      );

      const highSchools = places.filter(p =>
        p.name.toLowerCase().includes('high school') ||
        p.name.toLowerCase().includes('secondary')
      );

      const privateSchools = places.filter(p =>
        p.name.toLowerCase().includes('private') ||
        p.name.toLowerCase().includes('montessori')
      );

      const elementarySchools = places.filter(p =>
        p.name.toLowerCase().includes('elementary') ||
        p.name.toLowerCase().includes('public school') ||
        p.name.toLowerCase().includes('catholic school')
      );

      console.log(`Found ${places.length} unique schools (${universities.length} universities, ${highSchools.length} high schools, ${elementarySchools.length} elementary)`);

    } else if (category === 'park') {
      // For parks, combine regular amenities with parks data
      places = [...getAmenitiesByCategory(category), ...getParks()];
    } else if (category === 'grocery') {
      // For grocery stores, combine regular amenities with grocery store data
      const groceryMap = new Map(); // To avoid duplicates

      // Process regular grocery amenities
      const groceryAmenities = getAmenitiesByCategory(category);
      for (const store of groceryAmenities) {
        const key = `${store.name}-${store.address}`.toLowerCase();
        if (!groceryMap.has(key)) {
          groceryMap.set(key, store);
        }
      }

      // Add grocery stores data (avoiding duplicates)
      const groceryData = getGroceryStores();
      for (const store of groceryData) {
        const key = `${store.name}-${store.address}`.toLowerCase();
        if (!groceryMap.has(key)) {
          groceryMap.set(key, store);
        }
      }

      // Convert map values to array
      places = Array.from(groceryMap.values());
      console.log(`Found ${places.length} unique grocery stores`);

    } else if (category === 'restaurant') {
      // For restaurants, combine regular amenities with restaurant data
      const restaurantMap = new Map(); // To avoid duplicates

      // Process regular restaurant amenities
      const restaurantAmenities = getAmenitiesByCategory(category);
      for (const restaurant of restaurantAmenities) {
        const key = `${restaurant.name}-${restaurant.address}`.toLowerCase();
        if (!restaurantMap.has(key)) {
          restaurantMap.set(key, restaurant);
        }
      }

      // Add restaurant data (avoiding duplicates)
      const restaurantData = getRestaurants();
      for (const restaurant of restaurantData) {
        const key = `${restaurant.name}-${restaurant.address}`.toLowerCase();
        if (!restaurantMap.has(key)) {
          restaurantMap.set(key, restaurant);
        }
      }

      // Convert map values to array
      places = Array.from(restaurantMap.values());
      console.log(`Found ${places.length} unique restaurants`);

    } else {
      places = getAmenitiesByCategory(category);
    }

    // First, calculate direct distance to each place using the faster Haversine formula
    const placesWithDirectDistance = places.map(place => {
      try {
        const distance = calculateHaversineDistance(
          coordinates,
          { lat: place.lat, lng: place.lng }
        );

        return {
          ...place,
          distance: Math.round(distance)  // Round to nearest meter
        };
      } catch (error) {
        console.error(`Error calculating distance to ${category} place:`, error);
        return {
          ...place,
          distance: Infinity
        };
      }
    });

    // Filter places within 3km (reasonable walking/consideration distance)
    const nearbyPlaces = placesWithDirectDistance.filter(place => place.distance <= 3000);

    // Calculate walking and driving time for nearby places
    const placesWithDistance = nearbyPlaces.map(place => {
      try {
        // Calculate walking time for places we've already determined are nearby
        const walkingTime = calculateWalkingTime(
          coordinates,
          { lat: parseFloat(place.lat), lng: parseFloat(place.lng) }
        );

        // Calculate driving time for all places
        const drivingTime = calculateDrivingTime(
          coordinates,
          { lat: parseFloat(place.lat), lng: parseFloat(place.lng) }
        );

        return {
          ...place,
          walkingTime: walkingTime,
          drivingTime: drivingTime
        };
      } catch (error) {
        console.error(`Error calculating travel times to ${category} place:`, error);
        return {
          ...place,
          walkingTime: null,
          drivingTime: null
        };
      }
    });

    // Add back any places beyond 3km but within our consideration radius
    // Calculate only driving time for these farther places
    const farPlaces = placesWithDirectDistance.filter(place =>
      place.distance > 3000 && place.distance <= 5000 // Consideration radius for livability (5km)
    ).map(place => {
      try {
        // Calculate driving time for farther places
        const drivingTime = calculateDrivingTime(
          coordinates,
          { lat: parseFloat(place.lat), lng: parseFloat(place.lng) }
        );

        return {
          ...place,
          walkingTime: null, // Too far for walking
          drivingTime: drivingTime
        };
      } catch (error) {
        console.error(`Error calculating driving time to ${category} place:`, error);
        return {
          ...place,
          walkingTime: null,
          drivingTime: null
        };
      }
    });

    // Combine nearby places (with walking times) and far places (without walking times)
    const allRelevantPlaces = [...placesWithDistance, ...farPlaces];

    // Sort by distance
    allRelevantPlaces.sort((a, b) => a.distance - b.distance);

    // Calculate score for this category based on proximity
    const placesWithinScoreRadius = allRelevantPlaces.filter(p => p.distance <= 2000);

    let score = 0;
    if (placesWithinScoreRadius.length > 0) {
      // Base score on number of places within 2km and distance to nearest
      const nearest = placesWithinScoreRadius[0];

      // Distance factor: closer is better
      let distanceFactor = 0;
      if (nearest.distance <= 250) {
        distanceFactor = 1.0;
      } else if (nearest.distance <= 500) {
        distanceFactor = 0.9;
      } else if (nearest.distance <= 750) {
        distanceFactor = 0.8;
      } else if (nearest.distance <= 1000) {
        distanceFactor = 0.7;
      } else if (nearest.distance <= 1500) {
        distanceFactor = 0.6;
      } else {
        distanceFactor = 0.5;
      }

      // Walking time factor: if walking time is available, use it to adjust the distance factor
      if (nearest.walkingTime && !nearest.walkingTime.isEstimate) {
        const walkingMinutes = nearest.walkingTime.minutes;
        let walkingFactor = 0;

        if (walkingMinutes <= 5) {
          walkingFactor = 1.0;
        } else if (walkingMinutes <= 10) {
          walkingFactor = 0.9;
        } else if (walkingMinutes <= 15) {
          walkingFactor = 0.8;
        } else if (walkingMinutes <= 20) {
          walkingFactor = 0.7;
        } else if (walkingMinutes <= 30) {
          walkingFactor = 0.6;
        } else {
          walkingFactor = 0.5;
        }

        // Combine distance factor and walking factor (weighted average)
        distanceFactor = (distanceFactor * 0.6) + (walkingFactor * 0.4);
      }

      // Quantity factor: more is better (up to a reasonable limit)
      let quantityFactor = 0;
      if (category === 'restaurant') {
        if (nearbyPlaces.length >= 15) quantityFactor = 1.0;
        else if (nearbyPlaces.length >= 10) quantityFactor = 0.9;
        else if (nearbyPlaces.length >= 5) quantityFactor = 0.8;
        else if (nearbyPlaces.length >= 3) quantityFactor = 0.7;
        else quantityFactor = 0.6;
      } else if (category === 'entertainment') {
        if (nearbyPlaces.length >= 8) quantityFactor = 1.0;
        else if (nearbyPlaces.length >= 5) quantityFactor = 0.9;
        else if (nearbyPlaces.length >= 3) quantityFactor = 0.8;
        else if (nearbyPlaces.length >= 2) quantityFactor = 0.7;
        else quantityFactor = 0.6;
      } else if (category === 'park') {
        if (nearbyPlaces.length >= 5) quantityFactor = 1.0;
        else if (nearbyPlaces.length >= 3) quantityFactor = 0.9;
        else if (nearbyPlaces.length >= 2) quantityFactor = 0.8;
        else quantityFactor = 0.7;
      } else if (category === 'school') {
        if (nearbyPlaces.length >= 5) quantityFactor = 1.0;
        else if (nearbyPlaces.length >= 3) quantityFactor = 0.9;
        else if (nearbyPlaces.length >= 2) quantityFactor = 0.8;
        else quantityFactor = 0.7;
      } else if (category === 'grocery') {
        if (nearbyPlaces.length >= 4) quantityFactor = 1.0;
        else if (nearbyPlaces.length >= 3) quantityFactor = 0.9;
        else if (nearbyPlaces.length >= 2) quantityFactor = 0.8;
        else quantityFactor = 0.7;
      }

      // Quality factor (if rating is available)
      const avgRating = nearbyPlaces
        .filter(p => p.rating && p.rating > 0)
        .reduce((sum, p) => sum + p.rating, 0) /
        nearbyPlaces.filter(p => p.rating && p.rating > 0).length || 0;

      let qualityFactor = 0.8;  // Default if no ratings
      if (avgRating >= 4.5) qualityFactor = 1.0;
      else if (avgRating >= 4.0) qualityFactor = 0.9;
      else if (avgRating >= 3.5) qualityFactor = 0.8;
      else if (avgRating >= 3.0) qualityFactor = 0.7;
      else if (avgRating > 0) qualityFactor = 0.6;

      // Combine factors to get final score (out of 100)
      score = Math.round((distanceFactor * 0.4 + quantityFactor * 0.4 + qualityFactor * 0.2) * 100);
    }

    scores[category] = score;
    categoryPlaces[category] = nearbyPlaces.slice(0, 5);  // Keep top 5 for display
  }

  // Calculate overall livability score (average of all category scores)
  const categoryWeights = {
    restaurant: 0.25,
    entertainment: 0.20,
    park: 0.15,
    school: 0.25,
    grocery: 0.15
  };

  const overallScore = Math.round(
    Object.keys(scores).reduce((sum, category) => {
      return sum + scores[category] * categoryWeights[category];
    }, 0)
  );

  // Find the closest place in each category with walking time
  const closestPlaces = {};

  for (const category of categories) {
    if (categoryPlaces[category] && categoryPlaces[category].length > 0) {
      // Places are already sorted by distance, so the first one is the closest
      closestPlaces[category] = categoryPlaces[category][0];
    }
  }

  return {
    score: overallScore,
    categoryScores: scores,
    places: categoryPlaces,
    closestPlaces: closestPlaces
  };
};

/**
 * Get nearby amenities within radius
 * @param {Object} params - Parameters
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {number} params.radius - Radius in meters
 * @param {Object} dataSources - Optional data sources
 * @returns {Object} - Nearby amenities by category
 */
const getNearbyAmenities = (params, dataSources = null) => {
  const { lat, lng, radius } = params;
  const location = { lat, lng };

  console.log(`Finding amenities within ${radius}m of (${lat}, ${lng})`);

  // Get amenities from data sources if provided, otherwise from dataLoader
  let retailPlaces = [];
  let restaurantPlaces = [];
  let entertainmentPlaces = [];
  let parkPlaces = [];
  let schoolPlaces = [];

  // Use getAmenitiesByCategory to get amenities by type
  try {
    retailPlaces = getAmenitiesByCategory('retail');
    console.log(`Found ${retailPlaces.length} retail places`);

    restaurantPlaces = getAmenitiesByCategory('restaurant');
    console.log(`Found ${restaurantPlaces.length} restaurants`);

    entertainmentPlaces = getAmenitiesByCategory('entertainment');
    console.log(`Found ${entertainmentPlaces.length} entertainment places`);

    // Get parks specifically
    const amenityParks = getAmenitiesByCategory('park');
    const dedicatedParks = getParks();
    parkPlaces = [...amenityParks, ...dedicatedParks];
    console.log(`Found ${parkPlaces.length} parks`);

    // Combine regular school amenities with education data
    const regularSchools = getAmenitiesByCategory('school');
    const educationData = getEducation();

    // Create a map to track schools by address to avoid duplicates
    const schoolMap = new Map();

    // Process regular schools first
    regularSchools.forEach(school => {
      const key = `${school.name}-${school.address}`.toLowerCase();
      if (!schoolMap.has(key)) {
        schoolMap.set(key, school);
      }
    });

    // Add education data, avoiding duplicates
    educationData.forEach(school => {
      const key = `${school.name}-${school.address}`.toLowerCase();
      if (!schoolMap.has(key)) {
        schoolMap.set(key, school);
      }
    });

    schoolPlaces = Array.from(schoolMap.values());
    console.log(`Found ${schoolPlaces.length} unique schools and educational institutions`);
  } catch (error) {
    console.error('Error getting amenities:', error);
  }

  // Filter and sort amenities by distance
  const result = {
    retail: filterAndSortByDistance(retailPlaces, location, radius),
    restaurant: filterAndSortByDistance(restaurantPlaces, location, radius),
    entertainment: filterAndSortByDistance(entertainmentPlaces, location, radius),
    park: filterAndSortByDistance(parkPlaces, location, radius),
    school: filterAndSortByDistance(schoolPlaces, location, radius)
  };

  // Log the results
  console.log(`Found ${result.retail.length} retail places within ${radius}m`);
  console.log(`Found ${result.restaurant.length} restaurants within ${radius}m`);
  console.log(`Found ${result.entertainment.length} entertainment places within ${radius}m`);
  console.log(`Found ${result.park.length} parks within ${radius}m`);
  console.log(`Found ${result.school.length} schools within ${radius}m`);

  return result;
};

/**
 * Filter and sort places by distance
 * @param {Array} places - Array of places
 * @param {Object} location - Location with lat and lng
 * @param {number} radius - Maximum radius in meters
 * @returns {Array} - Filtered and sorted places
 */
const filterAndSortByDistance = (places, location, radius) => {
  if (!places || places.length === 0) return [];

  // Calculate distance for each place
  const placesWithDistance = places.map(place => {
    try {
      const distance = calculateHaversineDistance(
        location,
        { lat: parseFloat(place.lat), lng: parseFloat(place.lng) }
      );

      return {
        ...place,
        distance: Math.round(distance),
        rating: parseFloat(place.rating || 0)
      };
    } catch (error) {
      console.error(`Error calculating distance for place ${place.name}:`, error);
      return {
        ...place,
        distance: Infinity,
        rating: parseFloat(place.rating || 0)
      };
    }
  });

  // Filter places within radius
  const withinRadius = placesWithDistance.filter(place => place.distance <= radius);

  // Sort by distance
  return withinRadius.sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate score for a category
 * @param {Array} places - Array of places
 * @param {number} optimalDistance - Optimal distance in meters
 * @returns {Object} - Score and details
 */
const calculateCategoryScore = (places, optimalDistance) => {
  if (!places || places.length === 0) {
    return {
      score: 0,
      count: 0,
      items: [],
      averageDistance: 0,
      averageRating: 0
    };
  }

  // Calculate distance and rating factors
  let distanceScore = 0;
  let ratingScore = 0;
  let countFactor = 0;

  // Quality of places (how many, average distance, average rating)
  const count = Math.min(places.length, 5); // Cap at 5 for scoring
  const totalDistance = places.slice(0, count).reduce((sum, p) => sum + p.distance, 0);
  const totalRating = places.slice(0, count).reduce((sum, p) => sum + p.rating, 0);
  const averageDistance = Math.round(totalDistance / count);
  const averageRating = parseFloat((totalRating / count).toFixed(1));

  // Distance factor (closer is better)
  if (averageDistance <= optimalDistance * 0.25) {
    distanceScore = 100;
  } else if (averageDistance >= optimalDistance) {
    distanceScore = 50;
  } else {
    // Linear scale between optimal and 25% of optimal
    distanceScore = 50 + Math.round(
      50 * (1 - (averageDistance - optimalDistance * 0.25) / (optimalDistance * 0.75))
    );
  }

  // Rating factor (better rating is better)
  ratingScore = Math.round((averageRating / 5) * 100);

  // Count factor (more places is better, up to 5)
  countFactor = Math.min(places.length / 5, 1);

  // Combined score
  const score = Math.round(distanceScore * 0.5 + ratingScore * 0.3 + countFactor * 100 * 0.2);

  return {
    score,
    count: places.length,
    items: places.slice(0, 5), // Return top 5 places
    averageDistance,
    averageRating
  };
};

/**
 * Calculate park score with special consideration for different park types and sizes
 * @param {Array} places - Array of park places
 * @param {number} optimalDistance - Optimal distance in meters
 * @returns {Object} - Score and details
 */
const calculateParkScore = (places, optimalDistance) => {
  if (!places || places.length === 0) {
    return {
      score: 0,
      count: 0,
      items: [],
      averageDistance: 0,
      averageRating: 0,
      details: {
        majorParks: 0,
        neighborhoodParks: 0,
        totalArea: 0
      }
    };
  }

  // Group parks by type based on rating (higher ratings typically for major parks)
  const majorParks = places.filter(p => parseFloat(p.rating) >= 4.5);
  const neighborhoodParks = places.filter(p => parseFloat(p.rating) < 4.5);

  // Calculate base score using standard method
  const baseScore = calculateCategoryScore(places, optimalDistance);

  // Apply bonus for closest major park (if any)
  let parkBonus = 0;
  if (majorParks.length > 0) {
    // Sort major parks by distance
    const sortedMajorParks = [...majorParks].sort((a, b) => a.distance - b.distance);
    const closestMajorPark = sortedMajorParks[0];

    // Bonus for having a major park nearby
    if (closestMajorPark.distance <= 500) {
      parkBonus += 20; // Major bonus for very close major parks
    } else if (closestMajorPark.distance <= 1000) {
      parkBonus += 15;
    } else if (closestMajorPark.distance <= 2000) {
      parkBonus += 10;
    } else {
      parkBonus += 5;
    }
  }

  // Bonus for variety and number of parks
  if (places.length >= 5) parkBonus += 10;
  else if (places.length >= 3) parkBonus += 5;

  // Cap park bonus
  parkBonus = Math.min(parkBonus, 25);

  // Adjust score with park bonus but don't exceed 100
  const adjustedScore = Math.min(baseScore.score + parkBonus, 100);

  return {
    ...baseScore,
    score: adjustedScore,
    details: {
      majorParks: majorParks.length,
      neighborhoodParks: neighborhoodParks.length,
      totalArea: places.length * 5 // Rough estimation of total park area
    }
  };
};

/**
 * Calculate education score with special consideration for different education types
 * @param {Array} places - Array of school places
 * @param {number} optimalDistance - Optimal distance in meters
 * @returns {Object} - Score and details
 */
const calculateEducationScore = (places, optimalDistance) => {
  if (!places || places.length === 0) {
    return {
      score: 0,
      count: 0,
      items: [],
      averageDistance: 0,
      averageRating: 0,
      details: {
        universities: 0,
        highSchools: 0,
        elementarySchools: 0,
        privateSchools: 0
      }
    };
  }

  // Group schools by type based on name patterns
  const universities = places.filter(p =>
    (p.name || '').toLowerCase().includes('university') ||
    (p.name || '').toLowerCase().includes('college') ||
    (p.name || '').toLowerCase().includes('collège') ||
    (p.name || '').toLowerCase().includes('campus') ||
    (p.name || '').toLowerCase().includes('polytechnique')
  );

  const highSchools = places.filter(p =>
    (p.name || '').toLowerCase().includes('high school') ||
    (p.name || '').toLowerCase().includes('secondary') ||
    (p.name || '').toLowerCase().includes('école secondaire') ||
    (p.name || '').toLowerCase().includes('collegiate') ||
    (p.name || '').toLowerCase().includes('high') ||
    (p.name || '').toLowerCase().includes('middle school')
  );

  const privateSchools = places.filter(p =>
    (p.name || '').toLowerCase().includes('private') ||
    (p.name || '').toLowerCase().includes('academy') ||
    (p.name || '').toLowerCase().includes('montessori') ||
    (p.name || '').toLowerCase().includes('ashbury') ||
    (p.name || '').toLowerCase().includes('elmwood')
  );

  // Elementary schools are those not in other categories, or explicitly named elementary schools
  const elementarySchools = places.filter(p =>
    ((p.name || '').toLowerCase().includes('elementary') ||
     (p.name || '').toLowerCase().includes('primary') ||
     (p.name || '').toLowerCase().includes('école élémentaire') ||
     (p.name || '').toLowerCase().includes('public school')) ||
    (!universities.includes(p) &&
     !highSchools.includes(p) &&
     !privateSchools.includes(p))
  );

  // Calculate base score using standard method
  const baseScore = calculateCategoryScore(places, optimalDistance);

  // Apply bonus for variety of school types
  let varietyBonus = 0;
  if (universities.length > 0) varietyBonus += 15;
  if (highSchools.length > 0) varietyBonus += 10;
  if (elementarySchools.length > 0) varietyBonus += 10;
  if (privateSchools.length > 0) varietyBonus += 5;

  // Cap variety bonus
  varietyBonus = Math.min(varietyBonus, 25);

  // Adjust score with variety bonus but don't exceed 100
  const adjustedScore = Math.min(baseScore.score + varietyBonus, 100);

  return {
    ...baseScore,
    score: adjustedScore,
    details: {
      universities: universities.length,
      highSchools: highSchools.length,
      elementarySchools: elementarySchools.length,
      privateSchools: privateSchools.length
    }
  };
};