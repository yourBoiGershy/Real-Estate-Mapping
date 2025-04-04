import { calculateHaversineDistance } from './customGeoAnalysis.js';
import { getEmergencyServices } from '../data/dataLoader.js';

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
  
  // Calculate distance to each emergency service
  const servicesWithDistance = emergencyServices.map(service => {
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
  
  // Sort services by distance
  const sortedServices = servicesWithDistance.sort((a, b) => a.distance - b.distance);
  
  // Split services by type
  const hospitals = sortedServices.filter(s => s.type === 'hospital');
  const fireStations = sortedServices.filter(s => s.type === 'fire');
  const policeStations = sortedServices.filter(s => s.type === 'police');
  
  // Get nearest service of each type
  const nearestHospital = hospitals.length > 0 ? hospitals[0] : null;
  const nearestFireStation = fireStations.length > 0 ? fireStations[0] : null;
  const nearestPoliceStation = policeStations.length > 0 ? policeStations[0] : null;
  
  // Calculate hospital score (0-40 points, weighted more heavily)
  let hospitalScore = 0;
  if (nearestHospital) {
    if (nearestHospital.distance <= 1000) {
      hospitalScore = 40;
    } else if (nearestHospital.distance <= 2000) {
      hospitalScore = 35;
    } else if (nearestHospital.distance <= 3000) {
      hospitalScore = 30;
    } else if (nearestHospital.distance <= 5000) {
      hospitalScore = 25;
    } else if (nearestHospital.distance <= 7000) {
      hospitalScore = 20;
    } else if (nearestHospital.distance <= 10000) {
      hospitalScore = 15;
    } else {
      hospitalScore = 10;
    }
  }
  
  // Calculate fire station score (0-30 points)
  let fireStationScore = 0;
  if (nearestFireStation) {
    if (nearestFireStation.distance <= 1000) {
      fireStationScore = 30;
    } else if (nearestFireStation.distance <= 2000) {
      fireStationScore = 25;
    } else if (nearestFireStation.distance <= 3000) {
      fireStationScore = 20;
    } else if (nearestFireStation.distance <= 5000) {
      fireStationScore = 15;
    } else if (nearestFireStation.distance <= 7000) {
      fireStationScore = 10;
    } else {
      fireStationScore = 5;
    }
  }
  
  // Calculate police station score (0-30 points)
  let policeStationScore = 0;
  if (nearestPoliceStation) {
    if (nearestPoliceStation.distance <= 1000) {
      policeStationScore = 30;
    } else if (nearestPoliceStation.distance <= 2000) {
      policeStationScore = 25;
    } else if (nearestPoliceStation.distance <= 3000) {
      policeStationScore = 20;
    } else if (nearestPoliceStation.distance <= 5000) {
      policeStationScore = 15;
    } else if (nearestPoliceStation.distance <= 7000) {
      policeStationScore = 10;
    } else {
      policeStationScore = 5;
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
    nearestPoliceStation
  };
};

export default {
  calculateEmergencyServicesScore
}; 