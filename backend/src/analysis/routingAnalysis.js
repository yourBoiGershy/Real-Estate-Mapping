/**
 * Routing analysis module for calculating walking paths and times
 * Implements Dijkstra's algorithm for finding shortest paths on a road network
 */

import { calculateHaversineDistance, degreesToRadians } from './customGeoAnalysis.js';
import { getMainRoads } from '../data/dataLoader.js';
import { getOsmRoads } from '../data/osmLoader.js';

// Average walking speed in meters per second (5 km/h)
const AVERAGE_WALKING_SPEED = 1.4;

// Average driving speeds in meters per second for different road types
const DRIVING_SPEEDS = {
  motorway: 27.8, // 100 km/h = 27.8 m/s
  trunk: 22.2,    // 80 km/h = 22.2 m/s
  primary: 16.7,  // 60 km/h = 16.7 m/s
  secondary: 13.9, // 50 km/h = 13.9 m/s
  tertiary: 11.1, // 40 km/h = 11.1 m/s
  residential: 8.3, // 30 km/h = 8.3 m/s
  service: 5.6,   // 20 km/h = 5.6 m/s
  default: 13.9   // 50 km/h = 13.9 m/s
};

// Traffic congestion factors (multipliers)
const TRAFFIC_FACTORS = {
  low: 1.0,      // No congestion
  medium: 1.3,   // Moderate congestion
  high: 1.8      // Heavy congestion
};

// Maximum distance in meters to consider for connecting a point to the road network
const MAX_SNAP_DISTANCE = 500;

// Threshold distance in meters to consider two points as the same intersection
const INTERSECTION_THRESHOLD = 50;

/**
 * Graph node representing a point in the road network
 */
class GraphNode {
  constructor(id, lat, lng) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.edges = []; // Connections to other nodes
  }

  addEdge(toNode, distance, roadName, roadType, travelTime) {
    this.edges.push({
      to: toNode,
      distance: distance,
      roadName: roadName,
      roadType: roadType,
      travelTime: travelTime
    });
  }
}

/**
 * Road network graph for routing
 */
class RoadGraph {
  constructor() {
    this.nodes = new Map(); // Map of node ID to node object
    this.initialized = false;
  }

  /**
   * Add a node to the graph
   * @param {string} id - Node ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {GraphNode} - The created or existing node
   */
  addNode(id, lat, lng) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, new GraphNode(id, lat, lng));
    }
    return this.nodes.get(id);
  }

  /**
   * Add an edge between two nodes
   * @param {string} fromId - Starting node ID
   * @param {string} toId - Ending node ID
   * @param {string} roadName - Name of the road
   */
  addEdge(fromId, toId, roadName, roadType = 'unknown', speedKmh = 50) {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode || !toNode) {
      console.warn(`Cannot add edge: node not found (${fromId} -> ${toId})`);
      return;
    }

    // Calculate distance between nodes
    const distance = calculateHaversineDistance(
      { lat: fromNode.lat, lng: fromNode.lng },
      { lat: toNode.lat, lng: toNode.lng }
    );

    // Calculate travel time based on road type and speed
    // Speed in km/h, distance in meters, time in seconds
    const speedMps = speedKmh / 3.6; // Convert km/h to m/s
    const travelTime = distance / speedMps; // Time in seconds

    // Add edge with travel time information
    fromNode.addEdge(toNode, distance, roadName, roadType, travelTime);

    // For non-highway roads, add reverse edge (unless it's a one-way street)
    if (roadType !== 'motorway' && roadType !== 'motorway_link' &&
        roadType !== 'trunk' && roadType !== 'trunk_link') {
      toNode.addEdge(fromNode, distance, roadName, roadType, travelTime);
    }
  }

  /**
   * Find the nearest node to a given location
   * @param {Object} location - Location with lat and lng
   * @param {number} maxDistance - Maximum distance to consider (meters)
   * @returns {Object} - Nearest node and distance
   */
  findNearestNode(location, maxDistance = MAX_SNAP_DISTANCE) {
    let nearestNode = null;
    let minDistance = maxDistance;

    for (const node of this.nodes.values()) {
      const distance = calculateHaversineDistance(
        { lat: location.lat, lng: location.lng },
        { lat: node.lat, lng: node.lng }
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    return {
      node: nearestNode,
      distance: minDistance
    };
  }

  /**
   * Find intersections between roads to create a connected graph
   * @param {Array} roads - Array of road segments
   */
  findIntersections(roads) {
    // Create a map to track potential intersections
    const pointMap = new Map();

    // Process each road
    for (const road of roads) {
      // Parse coordinates to ensure they are numbers
      const startLat = parseFloat(road.start_lat);
      const startLng = parseFloat(road.start_lng);
      const endLat = parseFloat(road.end_lat);
      const endLng = parseFloat(road.end_lng);

      // Create unique identifiers for start and end points
      const startPoint = `${startLat.toFixed(5)},${startLng.toFixed(5)}`;
      const endPoint = `${endLat.toFixed(5)},${endLng.toFixed(5)}`;

      // Add start point
      if (!pointMap.has(startPoint)) {
        pointMap.set(startPoint, {
          lat: startLat,
          lng: startLng,
          roads: [road.name]
        });
      } else {
        pointMap.get(startPoint).roads.push(road.name);
      }

      // Add end point
      if (!pointMap.has(endPoint)) {
        pointMap.set(endPoint, {
          lat: endLat,
          lng: endLng,
          roads: [road.name]
        });
      } else {
        pointMap.get(endPoint).roads.push(road.name);
      }
    }

    // Find points that are very close to each other (potential intersections)
    const points = Array.from(pointMap.values());

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const distance = calculateHaversineDistance(
          { lat: points[i].lat, lng: points[i].lng },
          { lat: points[j].lat, lng: points[j].lng }
        );

        // If points are close enough, merge them as an intersection
        if (distance < INTERSECTION_THRESHOLD) {
          // Use the average position
          const avgLat = (points[i].lat + points[j].lat) / 2;
          const avgLng = (points[i].lng + points[j].lng) / 2;

          // Merge road lists
          const mergedRoads = [...new Set([...points[i].roads, ...points[j].roads])];

          // Update both points to have the same position and combined road list
          points[i].lat = avgLat;
          points[i].lng = avgLng;
          points[i].roads = mergedRoads;

          points[j].lat = avgLat;
          points[j].lng = avgLng;
          points[j].roads = mergedRoads;
        }
      }
    }

    return points;
  }

  /**
   * Build the road network graph from road data
   */
  async buildGraph() {
    if (this.initialized) {
      return;
    }

    let roads = [];

    try {
      // Try to get OSM roads first
      console.log('Attempting to load OpenStreetMap road data...');
      roads = await getOsmRoads();
      console.log(`Loaded ${roads.length} road segments from OpenStreetMap`);

      // For performance, limit the number of road segments if there are too many
      const MAX_ROAD_SEGMENTS = 50000;
      if (roads.length > MAX_ROAD_SEGMENTS) {
        console.log(`Limiting to ${MAX_ROAD_SEGMENTS} road segments for performance`);
        // Sort roads by type to prioritize major roads
        roads.sort((a, b) => {
          const typeOrder = {
            'motorway': 1,
            'trunk': 2,
            'primary': 3,
            'secondary': 4,
            'tertiary': 5,
            'residential': 6,
            'service': 7,
            'footway': 8,
            'path': 9
          };
          const aOrder = typeOrder[a.type] || 10;
          const bOrder = typeOrder[b.type] || 10;
          return aOrder - bOrder;
        });
        roads = roads.slice(0, MAX_ROAD_SEGMENTS);
      }
    } catch (error) {
      console.warn('Error loading OSM roads, falling back to main roads data:', error.message);
      // Fall back to main roads data
      roads = getMainRoads();
      console.log(`Falling back to ${roads.length} main road segments`);
    }

    if (!roads || roads.length === 0) {
      console.warn('No road data available to build graph');
      return;
    }

    console.log(`Building road graph from ${roads.length} road segments`);

    // Skip finding intersections for large datasets (performance optimization)
    if (roads.length < 1000) {
      // Find intersections to create a more connected graph
      const intersections = this.findIntersections(roads);
    }

    // Process roads in batches for better performance
    const BATCH_SIZE = 1000;
    const totalBatches = Math.ceil(roads.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, roads.length);
      const batch = roads.slice(start, end);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} roads)`);

      // Add road segments to the graph
      for (const road of batch) {
        // Parse coordinates to ensure they are numbers
        const startLat = parseFloat(road.start_lat);
        const startLng = parseFloat(road.start_lng);
        const endLat = parseFloat(road.end_lat);
        const endLng = parseFloat(road.end_lng);

        // Create unique identifiers for start and end points
        const startId = `${startLat.toFixed(5)},${startLng.toFixed(5)}`;
        const endId = `${endLat.toFixed(5)},${endLng.toFixed(5)}`;

        const startNode = this.addNode(startId, startLat, startLng);
        const endNode = this.addNode(endId, endLat, endLng);

        // Add edge between start and end with road type information
        const roadType = road.type || 'unknown';
        const speedKmh = road.speed || 50; // Default 50 km/h if not specified

        this.addEdge(startId, endId, road.name, roadType, speedKmh);
      }
    }

    console.log(`Road graph built with ${this.nodes.size} nodes`);
    this.initialized = true;
  }

  /**
   * Find the shortest path between two locations using Dijkstra's algorithm
   * @param {Object} startLocation - Starting location with lat and lng
   * @param {Object} endLocation - Ending location with lat and lng
   * @returns {Object} - Path information including distance, time, and route
   */
  findShortestPath(startLocation, endLocation) {
    // Make sure the graph is built
    this.buildGraph();

    // Direct distance from start to end (as the crow flies)
    const directDistance = calculateHaversineDistance(startLocation, endLocation);

    // For very short distances (less than 200m), just use direct path
    if (directDistance < 200) {
      console.log('Locations are very close, using direct path');
      return {
        success: true,
        directDistance: directDistance,
        walkingDistance: directDistance,
        walkingTime: directDistance / AVERAGE_WALKING_SPEED,
        path: [
          { lat: startLocation.lat, lng: startLocation.lng },
          { lat: endLocation.lat, lng: endLocation.lng }
        ],
        method: 'direct'
      };
    }

    // Find nearest nodes to start and end locations
    const startNearest = this.findNearestNode(startLocation);
    const endNearest = this.findNearestNode(endLocation);

    // Debug information
    console.log(`Start nearest node: ${startNearest.node ? 'found' : 'not found'}, distance: ${startNearest.distance}m`);
    console.log(`End nearest node: ${endNearest.node ? 'found' : 'not found'}, distance: ${endNearest.distance}m`);

    // If we can't find nearby nodes, use a simple distance-based estimate
    if (!startNearest.node || !endNearest.node ||
        startNearest.distance > MAX_SNAP_DISTANCE ||
        endNearest.distance > MAX_SNAP_DISTANCE) {
      console.warn('Could not find nearby road network nodes, using direct distance estimate');
      // Use a simple multiplier to estimate actual walking distance (typically 1.2-1.4x direct distance)
      const estimatedWalkingDistance = directDistance * 1.3;
      return {
        success: true,
        directDistance: directDistance,
        walkingDistance: estimatedWalkingDistance,
        walkingTime: estimatedWalkingDistance / AVERAGE_WALKING_SPEED,
        path: [
          { lat: startLocation.lat, lng: startLocation.lng },
          { lat: endLocation.lat, lng: endLocation.lng }
        ],
        method: 'estimate'
      };
    }

    // If start and end are the same node, return direct path
    if (startNearest.node.id === endNearest.node.id) {
      return {
        success: true,
        directDistance: directDistance,
        walkingDistance: startNearest.distance + endNearest.distance,
        walkingTime: (startNearest.distance + endNearest.distance) / AVERAGE_WALKING_SPEED,
        path: [
          { lat: startLocation.lat, lng: startLocation.lng },
          { lat: startNearest.node.lat, lng: startNearest.node.lng },
          { lat: endLocation.lat, lng: endLocation.lng }
        ],
        method: 'same-node'
      };
    }

    // Initialize Dijkstra's algorithm
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    // Set initial distances to Infinity
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      unvisited.add(nodeId);
    }

    // Set distance to start node
    distances.set(startNearest.node.id, 0);

    // Main Dijkstra loop
    let iterations = 0;
    const MAX_ITERATIONS = 2000; // Reduced safety limit for better performance
    const CLOSE_ENOUGH_DISTANCE = 100; // Consider "close enough" if within 100m of destination

    // Track the closest we've gotten to the destination
    let closestNodeToDestination = null;
    let closestDistanceToDestination = Infinity;

    while (unvisited.size > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      // Find the unvisited node with the smallest distance (optimization: only check a subset)
      let currentId = null;
      let smallestDistance = Infinity;

      // For large graphs, checking every node is expensive
      // Instead, we'll check a random sample of nodes to find a good enough next node
      const MAX_NODES_TO_CHECK = Math.min(1000, unvisited.size);

      if (unvisited.size <= MAX_NODES_TO_CHECK) {
        // If we have a small number of nodes, check them all
        for (const nodeId of unvisited) {
          const distance = distances.get(nodeId);
          if (distance < smallestDistance) {
            smallestDistance = distance;
            currentId = nodeId;
          }
        }
      } else {
        // For large sets, convert to array and check a subset
        const unvisitedArray = Array.from(unvisited);
        for (let i = 0; i < MAX_NODES_TO_CHECK; i++) {
          const nodeId = unvisitedArray[i];
          const distance = distances.get(nodeId);
          if (distance < smallestDistance) {
            smallestDistance = distance;
            currentId = nodeId;
          }
        }
      }

      // If we can't find a node or we've reached the end, break
      if (currentId === null || smallestDistance === Infinity) {
        break;
      }

      // If we've reached the end node, we can stop
      if (currentId === endNearest.node.id) {
        console.log(`Found exact destination node after ${iterations} iterations`);
        break;
      }

      // Remove current node from unvisited set
      unvisited.delete(currentId);

      // Get the current node
      const currentNode = this.nodes.get(currentId);

      // Calculate direct distance from this node to the destination node
      const directDistanceToDestination = calculateHaversineDistance(
        { lat: currentNode.lat, lng: currentNode.lng },
        { lat: endNearest.node.lat, lng: endNearest.node.lng }
      );

      // Track the closest we've gotten to the destination
      if (directDistanceToDestination < closestDistanceToDestination) {
        closestDistanceToDestination = directDistanceToDestination;
        closestNodeToDestination = currentId;
      }

      // If we're close enough to the destination, we can stop
      // This is a key optimization to avoid excessive iterations
      if (directDistanceToDestination < CLOSE_ENOUGH_DISTANCE) {
        console.log(`Found node within ${directDistanceToDestination.toFixed(2)}m of destination after ${iterations} iterations - close enough!`);
        // Set the end node as reachable from this node
        const pathDistanceToHere = distances.get(currentId);
        distances.set(endNearest.node.id, pathDistanceToHere + directDistanceToDestination);
        previous.set(endNearest.node.id, currentId);
        break;
      }

      // Check each neighbor
      for (const edge of currentNode.edges) {
        const neighborId = edge.to.id;

        // Skip if this neighbor is not in unvisited (already processed)
        if (!unvisited.has(neighborId)) continue;

        // Calculate tentative distance
        const tentativeDistance = distances.get(currentId) + edge.distance;

        // If this path is shorter, update the distance
        if (tentativeDistance < distances.get(neighborId)) {
          distances.set(neighborId, tentativeDistance);
          previous.set(neighborId, currentId);
        }
      }

      // Periodically log progress for long-running searches
      if (iterations % 500 === 0) {
        console.log(`Dijkstra progress: ${iterations} iterations, closest approach: ${closestDistanceToDestination.toFixed(2)}m`);
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      // If we found a node that's close to the destination, use that instead of giving up
      if (closestNodeToDestination && closestDistanceToDestination < 500) {
        console.log(`Using closest approach (${closestDistanceToDestination.toFixed(2)}m) after max iterations`);
        // Set the end node as reachable from the closest node we found
        const pathDistanceToClosest = distances.get(closestNodeToDestination);
        distances.set(endNearest.node.id, pathDistanceToClosest + closestDistanceToDestination);
        previous.set(endNearest.node.id, closestNodeToDestination);
      } else {
        console.warn('Dijkstra algorithm reached maximum iterations, using direct distance estimate');
        const estimatedWalkingDistance = directDistance * 1.3;
        return {
          success: true,
          directDistance: directDistance,
          walkingDistance: estimatedWalkingDistance,
          walkingTime: estimatedWalkingDistance / AVERAGE_WALKING_SPEED,
          path: [
            { lat: startLocation.lat, lng: startLocation.lng },
            { lat: endLocation.lat, lng: endLocation.lng }
          ],
          method: 'max-iterations'
        };
      }
    }

    // Check if end node was reached
    if (distances.get(endNearest.node.id) === Infinity) {
      console.warn('No path found between locations, using direct distance estimate');

      // If the direct distance is small enough, just use that
      if (directDistance < 500) {
        return {
          success: true,
          directDistance: directDistance,
          walkingDistance: directDistance * 1.2, // Slight adjustment for non-direct walking
          walkingTime: (directDistance * 1.2) / AVERAGE_WALKING_SPEED,
          path: [
            { lat: startLocation.lat, lng: startLocation.lng },
            { lat: endLocation.lat, lng: endLocation.lng }
          ],
          method: 'direct-short'
        };
      }

      // For longer distances, use a more realistic multiplier
      const estimatedWalkingDistance = directDistance * 1.3;
      return {
        success: true,
        directDistance: directDistance,
        walkingDistance: estimatedWalkingDistance,
        walkingTime: estimatedWalkingDistance / AVERAGE_WALKING_SPEED,
        path: [
          { lat: startLocation.lat, lng: startLocation.lng },
          { lat: endLocation.lat, lng: endLocation.lng }
        ],
        method: 'no-path'
      };
    }

    // Reconstruct the path
    const path = [];
    let current = endNearest.node.id;

    // Add end location to path
    path.push({ lat: endLocation.lat, lng: endLocation.lng });

    // Add end nearest node
    path.push({ lat: endNearest.node.lat, lng: endNearest.node.lng });

    // Build the path backwards
    while (current !== startNearest.node.id) {
      const node = this.nodes.get(current);
      path.push({ lat: node.lat, lng: node.lng });
      current = previous.get(current);

      // Safety check for infinite loops
      if (!current) {
        console.warn('Path reconstruction failed, using partial path');
        break;
      }
    }

    // Add start nearest node
    path.push({ lat: startNearest.node.lat, lng: startNearest.node.lng });

    // Add start location
    path.push({ lat: startLocation.lat, lng: startLocation.lng });

    // Reverse the path to go from start to end
    path.reverse();

    // Calculate total walking distance
    let walkingDistance = distances.get(endNearest.node.id);

    // Add distance from actual start/end points to nearest nodes
    walkingDistance += startNearest.distance + endNearest.distance;

    // Calculate walking time in seconds
    const walkingTime = walkingDistance / AVERAGE_WALKING_SPEED;

    return {
      success: true,
      directDistance: directDistance,
      walkingDistance: walkingDistance,
      walkingTime: walkingTime,
      path: path,
      method: 'dijkstra'
    };
  }
}

// Create a singleton instance of the road graph
const roadGraph = new RoadGraph();

/**
 * Calculate walking distance and time between two locations
 * @param {Object} startLocation - Starting location with lat and lng
 * @param {Object} endLocation - Ending location with lat and lng
 * @returns {Object} - Walking information including distance and time
 */
export const calculateWalkingInfo = (startLocation, endLocation) => {
  return roadGraph.findShortestPath(startLocation, endLocation);
};

/**
 * Calculate walking time in minutes between two locations
 * @param {Object} startLocation - Starting location with lat and lng
 * @param {Object} endLocation - Ending location with lat and lng
 * @returns {Object} - Walking time in minutes and distance in meters
 */
export const calculateWalkingTime = (startLocation, endLocation) => {
  const walkingInfo = calculateWalkingInfo(startLocation, endLocation);

  // Our improved algorithm always returns success=true, but we'll check the method
  const isEstimate = walkingInfo.method !== 'dijkstra' && walkingInfo.method !== 'same-node';

  return {
    minutes: Math.round(walkingInfo.walkingTime / 60),
    distance: Math.round(walkingInfo.walkingDistance),
    isEstimate: isEstimate,
    method: walkingInfo.method
  };
};

/**
 * Calculate driving time between two locations
 * @param {Object} startLocation - Starting location with lat and lng
 * @param {Object} endLocation - Ending location with lat and lng
 * @param {string} trafficLevel - Traffic level: 'low', 'medium', or 'high'
 * @returns {Object} - Driving time in minutes and distance in meters
 */
export const calculateDrivingTime = (startLocation, endLocation, trafficLevel = 'medium') => {
  // For very short distances, driving doesn't make sense
  const directDistance = calculateHaversineDistance(startLocation, endLocation);
  if (directDistance < 300) {
    return {
      minutes: 1, // Minimum 1 minute for very short drives (parking, etc.)
      distance: Math.round(directDistance),
      isEstimate: true,
      method: 'too-short-for-driving'
    };
  }

  // Get the path information using our routing algorithm
  const walkingInfo = calculateWalkingInfo(startLocation, endLocation);

  // Get traffic factor
  const trafficFactor = TRAFFIC_FACTORS[trafficLevel] || TRAFFIC_FACTORS.medium;

  // Determine road type based on distance (simplified model)
  let roadType = 'residential';
  if (directDistance > 10000) {
    roadType = 'motorway';
  } else if (directDistance > 5000) {
    roadType = 'trunk';
  } else if (directDistance > 2000) {
    roadType = 'primary';
  } else if (directDistance > 1000) {
    roadType = 'secondary';
  } else if (directDistance > 500) {
    roadType = 'tertiary';
  }

  // Calculate driving speed
  const drivingSpeed = DRIVING_SPEEDS[roadType] || DRIVING_SPEEDS.default;

  // Calculate driving time with traffic factor
  const drivingTimeSeconds = (walkingInfo.walkingDistance / drivingSpeed) * trafficFactor;

  // Add time for intersections and traffic lights (simplified model)
  // Assume one traffic light or intersection every 500m on average
  const intersections = Math.floor(walkingInfo.walkingDistance / 500);
  const intersectionDelay = intersections * 20; // 20 seconds per intersection on average

  // Total driving time in seconds
  const totalDrivingTimeSeconds = drivingTimeSeconds + intersectionDelay;

  // Minimum driving time is 1 minute
  const drivingTimeMinutes = Math.max(1, Math.round(totalDrivingTimeSeconds / 60));

  return {
    minutes: drivingTimeMinutes,
    distance: Math.round(walkingInfo.walkingDistance),
    isEstimate: walkingInfo.method !== 'dijkstra',
    method: walkingInfo.method,
    trafficLevel: trafficLevel
  };
};

/**
 * Initialize the road graph
 * Call this at application startup to preload the graph
 */
export const initializeRoadGraph = async () => {
  await roadGraph.buildGraph();
  console.log('Road graph initialization complete');
};
