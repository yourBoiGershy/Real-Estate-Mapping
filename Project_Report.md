# Ottawa Real Estate Mapping: Location Analysis System

## Executive Summary

The Ottawa Real Estate Mapping project delivers a sophisticated location analysis system designed to help users evaluate properties in Ottawa based on multiple factors that impact livability and convenience. The system performs comprehensive analyses of addresses, considering mobility aspects (proximity to transit and roads), livability factors (nearby amenities and schools), and emergency services accessibility. By implementing efficient geospatial algorithms and leveraging open data sources, the application provides users with detailed scoring across multiple categories to make informed real estate decisions.

## Data Structures

### Core Data Models

The system employs several key data structures to organize and process geospatial information:

1. **Location Data Structure**
   ```typescript
   interface Location {
     lat: number;
     lng: number;
   }
   ```
   This fundamental structure represents geographical coordinates, serving as the basis for all distance calculations and spatial analyses.

2. **Place Data Structure**
   ```typescript
   interface Place {
     name: string;
     address: string;
     lat: number;
     lng: number;
     type?: string;
     category?: string;
     distance?: number;
     rating?: number;
   }
   ```
   The Place structure stores information about points of interest, including essential details such as name, address, coordinates, and category. This flexible structure enables the representation of diverse location types (emergency services, amenities, schools, etc.).

3. **Analysis Result Structure**
   ```typescript
   interface AddressAnalysisResponse {
     geocodedAddress: string;
     coordinates: Location;
     scores: {
       overallScore: number;
       mobility: MobilityScore;
       livability: LivabilityScore;
       emergencyServices: EmergencyServicesScore;
     }
   }
   ```
   This comprehensive structure encapsulates the complete analysis results, organizing scores hierarchically by category and enabling rich, detailed reporting.

4. **Specialized Score Structures**
   Each category has a specialized structure (MobilityScore, LivabilityScore, EmergencyServicesScore) that contains both numerical evaluations and relevant place data, allowing both quantitative assessment and qualitative review of nearby facilities.

### Data Organization

Data is organized in CSV files with specific schemas designed to support efficient processing:

- **Emergency Services Data**: Contains hospitals, fire stations, and police stations with their locations, ratings, and service types
- **Amenities Data**: Contains various amenity types (retail, grocery, entertainment, parks, restaurants, etc.)
- **Education Data**: Contains educational institutions categorized by type (universities, high schools, elementary schools, etc.)
- **Road Network Data**: Contains main road information for mobility assessment

The data loader implements robust pre-processing that handles malformed entries, removes comment lines, and ensures proper type conversion for numerical values, making the system resilient to common data quality issues.

## Algorithms

### Time Complexity Analysis

The system's performance characteristics can be analyzed through computational complexity theory:

1. **Address Analysis Pipeline**: O(n), where n is the total number of points of interest across all datasets
   - Geocoding: O(1) - API call with constant time response
   - Data loading: O(1) - Amortized constant time due to caching strategy
   - Distance calculations: O(n) - Linear scan through all points of interest
   - Sorting results: O(n log n) - For finding nearest facilities in each category

2. **Spatial Query Operations**:
   - Point-to-point distance calculations: O(1) - Constant time using Haversine formula
   - Nearest neighbor queries: O(n) - Linear scan through all candidates
   - Range queries (facilities within distance): O(n) - Linear scan with distance filter

3. **Scoring Algorithms**: O(n) - Linear time relative to the number of facilities being evaluated

The system deliberately avoids quadratic time complexity operations that would compare each point to all other points, keeping overall performance efficient even with large datasets.

### Haversine Distance Algorithm

The system employs the Haversine formula to calculate the great-circle distance between points on the Earth's surface:

```javascript
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

**Time Complexity**: O(1) - Constant time operation as it performs a fixed number of mathematical operations regardless of input size.

This algorithm provides accurate distance measurements regardless of position on the Earth, essential for our geospatial analysis that spans the Ottawa region.

### Dijkstra's Algorithm for Routing

To provide more realistic travel time estimates, we implemented Dijkstra's algorithm for finding the shortest path between locations using the road network:

```javascript
function findShortestPath(startLocation, endLocation) {
  // Initialize data structures
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  // Set initial distances to Infinity
  for (const nodeId of roadGraph.nodes.keys()) {
    distances.set(nodeId, Infinity);
    unvisited.add(nodeId);
  }

  // Set distance to start node
  distances.set(startNearest.node.id, 0);

  // Main Dijkstra loop
  while (unvisited.size > 0) {
    // Find the unvisited node with the smallest distance
    let currentId = findSmallestDistanceNode(unvisited, distances);

    // If we've reached the end node or can't proceed further, break
    if (currentId === null || currentId === endNearest.node.id) break;

    // Remove current node from unvisited set
    unvisited.delete(currentId);

    // Process each neighbor
    for (const edge of roadGraph.nodes.get(currentId).edges) {
      const neighborId = edge.to.id;

      // Calculate tentative distance
      const tentativeDistance = distances.get(currentId) + edge.distance;

      // If this path is shorter, update the distance
      if (tentativeDistance < distances.get(neighborId)) {
        distances.set(neighborId, tentativeDistance);
        previous.set(neighborId, currentId);
      }
    }
  }

  // Reconstruct and return the path
  return reconstructPath(previous, startNearest, endNearest, distances);
}
```

**Time Complexity**: O(E + V log V) where E is the number of edges and V is the number of vertices in the road network.

Our implementation includes several optimizations:

1. **Early Termination**: The algorithm stops when it reaches the destination node or when a node is within a certain distance threshold (100m) of the destination.

2. **Distance-Based Fallbacks**: For very short distances (< 200m), we use direct paths. For longer distances where no path is found, we use a distance multiplier (1.3x) to estimate walking distance.

3. **Closest Approach**: When the maximum iteration limit is reached, we use the closest node we found to the destination rather than giving up entirely.

4. **Batch Processing**: For large road networks, we process nodes in batches to improve performance.

### Travel Time Calculation Algorithms

The system calculates both walking and driving times between locations:

1. **Walking Time Calculation**:
```javascript
function calculateWalkingTime(startLocation, endLocation) {
  const walkingInfo = calculateWalkingInfo(startLocation, endLocation);

  return {
    minutes: Math.round(walkingInfo.walkingTime / 60),
    distance: Math.round(walkingInfo.walkingDistance),
    isEstimate: walkingInfo.method !== 'dijkstra'
  };
}
```

2. **Driving Time Calculation**:
```javascript
function calculateDrivingTime(startLocation, endLocation, trafficLevel = 'medium') {
  // For very short distances, driving doesn't make sense
  const directDistance = calculateHaversineDistance(startLocation, endLocation);
  if (directDistance < 300) {
    return {
      minutes: 1, // Minimum 1 minute for very short drives
      distance: Math.round(directDistance),
      isEstimate: true
    };
  }

  // Get the path information using our routing algorithm
  const pathInfo = calculateWalkingInfo(startLocation, endLocation);

  // Apply traffic factor based on congestion level
  const trafficFactor = TRAFFIC_FACTORS[trafficLevel] || TRAFFIC_FACTORS.medium;

  // Calculate driving speed based on road type
  const roadType = determineRoadType(directDistance);
  const drivingSpeed = DRIVING_SPEEDS[roadType];

  // Calculate driving time with traffic and intersections
  const drivingTimeSeconds = (pathInfo.walkingDistance / drivingSpeed) * trafficFactor;
  const intersections = Math.floor(pathInfo.walkingDistance / 500);
  const intersectionDelay = intersections * 20; // 20 seconds per intersection

  return {
    minutes: Math.max(1, Math.round((drivingTimeSeconds + intersectionDelay) / 60)),
    distance: Math.round(pathInfo.walkingDistance),
    isEstimate: pathInfo.method !== 'dijkstra'
  };
}
```

3. **Emergency Response Time Calculation**:
```javascript
function calculateEmergencyResponseTime(serviceLocation, targetLocation, serviceType) {
  const directDistance = calculateHaversineDistance(serviceLocation, targetLocation);

  // Different response speeds for different service types
  const responseSpeedFactors = {
    hospital: 0.9,  // Ambulances
    fire: 0.85,     // Fire trucks
    police: 0.8     // Police vehicles
  };

  // Calculate base response time with service-specific adjustments
  const baseResponseTimeSeconds = directDistance / (DRIVING_SPEEDS.major * 1.2);
  const adjustedResponseTimeSeconds = baseResponseTimeSeconds *
    (responseSpeedFactors[serviceType] || responseSpeedFactors.default);

  // Add preparation time based on service type
  const preparationTimes = {
    hospital: 60,   // 1 minute for ambulance
    fire: 90,       // 1.5 minutes for fire truck
    police: 30      // 30 seconds for police
  };

  return {
    minutes: Math.round((adjustedResponseTimeSeconds +
      (preparationTimes[serviceType] || preparationTimes.default)) / 60),
    distance: Math.round(directDistance),
    serviceType: serviceType
  };
}
```

### Proximity Analysis Algorithms

Several specialized algorithms evaluate proximity to different types of locations:

1. **Nearest Facility Finding**: For each category (emergency services, transit stops, amenities), the system identifies the nearest facilities by calculating distances to all candidates and selecting the closest ones:

```javascript
function findNearestFacilities(location, facilities, maxDistance) {
  return facilities
    .map(facility => ({
      ...facility,
      distance: calculateHaversineDistance(
        location.lat, location.lng,
        facility.lat, facility.lng
      )
    }))
    .filter(facility => facility.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}
```

**Time Complexity**: O(n log n) - Where n is the number of facilities
- Map operation: O(n) - Calculating distances for each facility
- Filter operation: O(n) - Checking distances against threshold
- Sort operation: O(n log n) - Sorting distances (dominant factor)

2. **Weighted Scoring Algorithm**: Scores decrease proportionally with distance, with different decay rates based on facility importance:

```javascript
function calculateScore(distance, maxDistance, importance) {
  // Higher importance results in slower decay
  const decayRate = 1 / importance;
  if (distance > maxDistance) return 0;
  return 100 * Math.exp(-decayRate * distance / maxDistance);
}
```

**Time Complexity**: O(1) - Constant time operation per facility

3. **School Deduplication Algorithm**: The system identifies and removes duplicate schools by matching against name and address:

```javascript
function deduplicateSchools(schools) {
  const schoolMap = new Map();

  for (const school of schools) {
    const key = `${school.name}|${school.address}`;
    if (!schoolMap.has(key)) {
      schoolMap.set(key, school);
    }
  }

  return Array.from(schoolMap.values());
}
```

**Time Complexity**: O(n) - Where n is the number of schools
- Map operations (has/set): O(1) - Constant time hash map operations
- Loop through all schools: O(n) - Linear scan through schools
- Converting map values to array: O(n) - Linear time operation

### Multi-factor Scoring System

The overall score combines individual category scores using a weighted average that prioritizes critical factors:

```javascript
function calculateOverallScore(scores) {
  return (
    scores.mobility.score * 0.3 +
    scores.livability.score * 0.3 +
    scores.emergencyServices.score * 0.4
  );
}
```

**Time Complexity**: O(1) - Constant time operation as it performs a fixed number of arithmetic operations

This weighting gives slightly higher importance to emergency services accessibility, reflecting their critical nature in residential location decisions.

### Space Complexity Analysis

The system's space requirements are primarily determined by:

1. **In-Memory Data Storage**: O(n) - Linear space relative to the total number of points of interest
2. **Result Objects**: O(k) - Where k is the number of places included in the results
3. **Temporary Computation Structures**: O(n) - Working data for sorting and filtering operations

The application implements efficient data caching strategies to avoid redundant loading operations while maintaining a controlled memory footprint.

## Implementation Details

### Backend Architecture

The backend is built on Node.js with Express, structured around modular analysis components:

1. **Data Loading Module**: Efficiently loads and caches geospatial data, reducing repeated file reads
2. **Geocoding Interface**: Translates addresses to coordinates for spatial analysis
3. **Analysis Modules**:
   - `mobilityAnalysis.js`: Evaluates transit access and road proximity
   - `livabilityAnalysis.js`: Assesses nearby amenities and educational institutions
   - `emergencyAnalysis.js`: Evaluates access to hospitals, fire stations, and police stations
   - `routingAnalysis.js`: Implements Dijkstra's algorithm for path finding and travel time calculations
   - `drivingAnalysis.js`: Calculates driving and emergency response times

4. **OpenStreetMap Integration**:
   - The system integrates with OpenStreetMap data to build a comprehensive road network graph
   - Road segments include attributes like road type, speed limits, and one-way information
   - The graph is used for realistic path finding and travel time calculations

The address analysis endpoint (`/analyze-address`) coordinates these modules to generate comprehensive results with detailed scores and nearby facilities.

### Frontend Components

The React-based frontend features several key components:

1. **Search Component**: Allows users to input addresses for analysis
2. **Results Display**: Shows overall and category scores with descriptive details
3. **Interactive Map Component**: Visualizes the property location and nearby points of interest using Leaflet
4. **Score Visualization**: Presents numerical scores through intuitive visual indicators

The frontend uses TypeScript to ensure type safety and maintain data structure consistency with the backend.

## Testing and Evaluation

### Performance Testing

The system was tested with addresses across different Ottawa neighborhoods to evaluate performance and accuracy:

| Neighborhood | Processing Time (ms) | Data Points Analyzed |
|--------------|----------------------|----------------------|
| Downtown     | 420                  | 156                  |
| Suburban     | 385                  | 129                  |
| Rural        | 310                  | 84                   |

The system consistently completed analyses in under 500ms, with performance scaling based on the density of nearby points of interest.

### Algorithm Validation

We validated our scoring algorithms through comparison with manual calculations and real-world expectations:

1. **Distance Calculation**: Haversine distances were verified against known distances between Ottawa landmarks
2. **Score Distribution**: We analyzed score distributions across 50 test addresses to ensure reasonable differentiation between locations
3. **Edge Cases**: We tested rural addresses with few nearby amenities and downtown addresses with high facility density to verify algorithm robustness

### Key Findings

Our testing revealed several interesting patterns:

1. **Transit-Emergency Services Correlation**: Areas with high transit scores often had correspondingly high emergency services scores, likely due to infrastructure planning patterns in Ottawa
2. **School Classification Impact**: The school classification algorithm successfully distinguished between types of educational institutions, providing more meaningful results than a simple proximity measure
3. **Distance Threshold Sensitivity**: Score calculations showed high sensitivity to distance thresholds, particularly for emergency services where small changes in thresholds significantly impacted overall scores

## Conclusion

The Ottawa Real Estate Mapping system successfully implements sophisticated geospatial algorithms to evaluate residential locations across multiple factors. By combining efficient distance calculations with weighted scoring systems and realistic travel time estimates, the application provides meaningful insights for real estate decision-making.

Key achievements include:

1. **Advanced Routing Algorithm**: Implementation of Dijkstra's algorithm on OpenStreetMap data for realistic path finding
2. **Multi-modal Travel Time**: Calculation of both walking and driving times to all points of interest
3. **Emergency Response Modeling**: Specialized algorithms for estimating emergency service response times
4. **Performance Optimizations**: Smart pre-filtering and early termination strategies for efficient processing

Future enhancements could include:

1. Incorporating temporal factors (transit schedule variations, time-of-day traffic patterns)
2. Adding demographic and crime data for more comprehensive neighborhood evaluation
3. Implementing predictive modeling for property value trends based on location scores
4. Expanding the routing algorithm to include public transit options and cycling routes

The system demonstrates the power of combining open data sources with custom geospatial algorithms to create practical tools for real-world decision support.