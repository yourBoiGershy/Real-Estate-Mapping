import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getEmergencyServices } from '../data/dataLoader.js';
import { calculateEmergencyResponseTime } from './drivingAnalysis.js';
import { calculateDrivingTime } from './routingAnalysis.js';

/**
 * Calculate emergency services score for a given location
 * @param {Object} coordinates - Location coordinates {lat, lng}
 * @returns {Object} - Emergency services score and details
 */
export const calculateEmergencyServicesScore = (coordinates) => {
  const { lat, lng } = coordinates;

  // Get emergency services data
  const emergencyServices = getEmergencyServices();

  // Check if data is available
  if (!emergencyServices || emergencyServices.length === 0) {
    console.warn('No emergency services data available');
    return {
      score: 0,
      services: [],
      hospitalScore: 0,
      fireStationScore: 0,
      policeStationScore: 0,
      hospitals: [],
      fireStations: [],
      policeStations: [],
      nearestHospital: null,
      nearestFireStation: null,
      nearestPoliceStation: null
    };
  }

  console.log(`Calculating emergency services score for ${lat}, ${lng} with ${emergencyServices.length} services`);

  // First, calculate direct distance to each emergency service using the faster Haversine formula
  const servicesWithDirectDistance = emergencyServices.map(service => {
    try {
      const distance = calculateHaversineDistance(
        { lat, lng },
        { lat: service.lat, lng: service.lng }
      );

      return {
        ...service,
        distance: Math.round(distance)
      };
    } catch (error) {
      console.error(`Error calculating distance to emergency service:`, error);
      return {
        ...service,
        distance: Infinity
      };
    }
  });

  // Sort services by direct distance
  const sortedByDistance = servicesWithDirectDistance.sort((a, b) => a.distance - b.distance);

  // Group services by type
  const servicesByType = {};
  for (const service of sortedByDistance) {
    if (!servicesByType[service.type]) {
      servicesByType[service.type] = [];
    }
    servicesByType[service.type].push(service);
  }

  // For each type, find the closest service
  const closestByType = {};
  for (const type in servicesByType) {
    if (servicesByType[type].length > 0) {
      closestByType[type] = servicesByType[type][0]; // The closest service of this type
    }
  }

  // Calculate response time for the closest service of each type
  for (const type in closestByType) {
    const service = closestByType[type];
    try {
      // Calculate emergency response time
      const responseTime = calculateEmergencyResponseTime(
        { lat: parseFloat(service.lat), lng: parseFloat(service.lng) },
        { lat, lng },
        service.type
      );

      // Calculate driving time
      const drivingTime = calculateDrivingTime(
        { lat, lng },
        { lat: parseFloat(service.lat), lng: parseFloat(service.lng) }
      );

      // Update the service with response time and driving time
      closestByType[type] = {
        ...service,
        responseTime: responseTime,
        drivingTime: drivingTime
      };
    } catch (error) {
      console.error(`Error calculating response time to ${type} service:`, error);
    }
  }

  // For scoring and display, we still need a list of services with distances
  // We'll calculate response times for a few more services of each type for better coverage
  const MAX_SERVICES_PER_TYPE = 3; // Calculate for the 3 nearest of each type

  // For each type, get the nearest MAX_SERVICES_PER_TYPE
  const nearestByType = {};
  for (const type in servicesByType) {
    nearestByType[type] = servicesByType[type].slice(0, MAX_SERVICES_PER_TYPE);
  }

  // Flatten the array of nearest services
  const nearestServices = Object.values(nearestByType).flat();

  // Calculate response time for these services
  const servicesWithDistance = nearestServices.map(service => {
    // If this is the closest service of its type, we already calculated its response time
    if (closestByType[service.type] && closestByType[service.type].id === service.id) {
      return closestByType[service.type];
    }

    try {
      // Calculate emergency response time
      const responseTime = calculateEmergencyResponseTime(
        { lat: parseFloat(service.lat), lng: parseFloat(service.lng) },
        { lat, lng },
        service.type
      );

      return {
        ...service,
        responseTime: responseTime
      };
    } catch (error) {
      console.error(`Error calculating response time to emergency service:`, error);
      return {
        ...service,
        responseTime: null
      };
    }
  });

  // Sort the services with response times by distance
  const sortedServices = servicesWithDistance.sort((a, b) => a.distance - b.distance);

  // Split services by type
  const hospitals = sortedServices.filter(s => s.type === 'hospital');
  const fireStations = sortedServices.filter(s => s.type === 'fire');
  const policeStations = sortedServices.filter(s => s.type === 'police');

  // Get nearest service of each type
  const nearestHospital = hospitals.length > 0 ? hospitals[0] : null;
  const nearestFireStation = fireStations.length > 0 ? fireStations[0] : null;
  const nearestPoliceStation = policeStations.length > 0 ? policeStations[0] : null;

  // Calculate hospital score based on response time (0-40 points, weighted more heavily)
  let hospitalScore = 0;
  if (nearestHospital && nearestHospital.responseTime) {
    const responseMinutes = nearestHospital.responseTime.minutes;

    if (responseMinutes <= 5) {
      hospitalScore = 100;
    } else if (responseMinutes <= 7) {
      hospitalScore = 90;
    } else if (responseMinutes <= 10) {
      hospitalScore = 75;
    } else if (responseMinutes <= 15) {
      hospitalScore = 50;
    } else if (responseMinutes <= 20) {
      hospitalScore = 20;
    } else if (responseMinutes <= 30) {
      hospitalScore = 15;
    } else {
      hospitalScore = 0;
    }
  } else if (nearestHospital) {
    // Fallback to distance-based scoring if response time is not available
    if (nearestHospital.distance <= 1000) {
      hospitalScore = 100;
    } else if (nearestHospital.distance <= 2000) {
      hospitalScore = 90;
    } else if (nearestHospital.distance <= 3000) {
      hospitalScore = 75;
    } else if (nearestHospital.distance <= 5000) {
      hospitalScore = 50;
    } else if (nearestHospital.distance <= 7000) {
      hospitalScore = 20;
    } else if (nearestHospital.distance <= 10000) {
      hospitalScore = 15;
    } else {
      hospitalScore = 0;
    }
  }

  // Calculate fire station score based on response time (0-30 points)
  let fireStationScore = 0;
  if (nearestFireStation && nearestFireStation.responseTime) {
    const responseMinutes = nearestFireStation.responseTime.minutes;

    if (responseMinutes <= 4) {
      fireStationScore = 100;
    } else if (responseMinutes <= 6) {
      fireStationScore = 90;
    } else if (responseMinutes <= 8) {
      fireStationScore = 75;
    } else if (responseMinutes <= 10) {
      fireStationScore = 50;
    } else if (responseMinutes <= 15) {
      fireStationScore = 20;
    } else {
      fireStationScore = 0;
    }
  } else if (nearestFireStation) {
    // Fallback to distance-based scoring if response time is not available
    if (nearestFireStation.distance <= 1000) {
      fireStationScore = 100;
    } else if (nearestFireStation.distance <= 2000) {
      fireStationScore = 90;
    } else if (nearestFireStation.distance <= 3000) {
      fireStationScore = 75;
    } else if (nearestFireStation.distance <= 5000) {
      fireStationScore = 50;
    } else if (nearestFireStation.distance <= 7000) {
      fireStationScore = 20;
    } else {
      fireStationScore = 0;
    }
  }

  // Calculate police station score based on response time (0-30 points)
  let policeStationScore = 0;
  if (nearestPoliceStation && nearestPoliceStation.responseTime) {
    const responseMinutes = nearestPoliceStation.responseTime.minutes;

    if (responseMinutes <= 3) {
      policeStationScore = 100;
    } else if (responseMinutes <= 5) {
      policeStationScore = 90;
    } else if (responseMinutes <= 7) {
      policeStationScore = 75;
    } else if (responseMinutes <= 10) {
      policeStationScore = 50;
    } else if (responseMinutes <= 15) {
      policeStationScore = 20;
    } else {
      policeStationScore = 0;
    }
  } else if (nearestPoliceStation) {
    // Fallback to distance-based scoring if response time is not available
    if (nearestPoliceStation.distance <= 1000) {
      policeStationScore = 100;
    } else if (nearestPoliceStation.distance <= 2000) {
      policeStationScore = 90;
    } else if (nearestPoliceStation.distance <= 3000) {
      policeStationScore = 75;
    } else if (nearestPoliceStation.distance <= 5000) {
      policeStationScore = 50;
    } else if (nearestPoliceStation.distance <= 7000) {
      policeStationScore = 20;
    } else {
      policeStationScore = 0;
    }
  }

  // Calculate overall score (weighted average with hospital weighted more heavily)
  const totalScore = Math.min(Math.round(
    (hospitalScore * 0.5) + (fireStationScore * 0.25) + (policeStationScore * 0.25)
  ), 100);

  return {
    score: totalScore,
    hospitalScore,
    fireStationScore,
    policeStationScore,
    services: sortedServices.slice(0, 10), // Return closest 10 services
    hospitals: hospitals.slice(0, 5), // Return closest 5 hospitals
    fireStations: fireStations.slice(0, 5), // Return closest 5 fire stations
    policeStations: policeStations.slice(0, 5), // Return closest 5 police stations
    nearestHospital,
    nearestFireStation,
    nearestPoliceStation,
    closestServices: closestByType // The closest service of each type with response time
  };
};

export default {
  calculateEmergencyServicesScore
};