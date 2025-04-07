// Types for address analysis API response

export interface AddressAnalysisResponse {
  geocodedAddress: string;
  lat: number;
  lng: number;
  scores: {
    mobility: MobilityScore;
    livability: LivabilityScore;
    emergencyServices: EmergencyServicesScore;
    overallScore: number;
  };
}

export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  rating: number;
  type?: string;
  walkingTime?: WalkingTime;
  drivingTime?: DrivingTime;
  responseTime?: ResponseTime;
}

export interface WalkingTime {
  minutes: number;
  isEstimate: boolean;
  method?: string;
}

export interface DrivingTime {
  minutes: number;
  isEstimate: boolean;
  method?: string;
  trafficLevel?: string;
}

export interface ResponseTime {
  minutes: number;
  serviceType: string;
}

export interface MobilityScore {
  score: number;
  transitStationScore: number;
  busStopScore: number;
  roadAccessScore: number;
  nearestTransitStation: {
    name: string;
    distance: number;
    id: string;
    walkingTime?: WalkingTime;
    drivingTime?: DrivingTime;
  } | null;
  nearestBusStop: {
    id: string;
    distance: number;
    routes: string[];
    walkingTime?: WalkingTime;
    drivingTime?: DrivingTime;
  } | null;
  nearestMainRoad: {
    name: string;
    distance: number;
    walkingTime?: WalkingTime;
    drivingTime?: DrivingTime;
  } | null;
}

export interface LivabilityScore {
  score: number;
  categoryScores: {
    restaurant: number;
    entertainment: number;
    park: number;
    school: number;
    grocery: number;
  };
  places: {
    restaurant: Place[];
    entertainment: Place[];
    park: Place[];
    school: Place[];
    grocery: Place[];
  };
}

export interface EmergencyServicesScore {
  score: number;
  medical: {
    score: number;
    hospitals: Place[];
    nearest: Place | null;
  };
  fire: {
    score: number;
    stations: Place[];
    nearest: Place | null;
  };
  police: {
    score: number;
    stations: Place[];
    nearest: Place | null;
  };
}

export interface GroceryScore {
  score: number;
  stores: Place[];
  nearestStore: Place | null;
}

export interface RestaurantScore {
  score: number;
  restaurants: Place[];
  nearestRestaurant: Place | null;
  restaurantsWithin2km: number;
}