/**
 * Routing analysis module for calculating walking paths and times
 * Implements Dijkstra's algorithm for finding shortest paths on a road network
 */

import { calculateHaversineDistance, degreesToRadians } from './customGeoAnalysis.js';
import { getMainRoads } from '../data/dataLoader.js';

// Average walking speed in meters per second (5 km/h)
const AVERAGE_WALKING_SPEED = 1.4; 

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

  addEdge(toNode, distance, roadName) {
    this.edges.push({
      to: toNode,
      distance: distance,
      roadName: roadName
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
  addEdge(fromId, toId, roadName) {
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
    
    // Add bidirectional edges (assuming roads can be traversed in both directions)
    fromNode.addEdge(toNode, distance, roadName);
    toNode.addEdge(fromNode, distance, roadName);
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
      const startPoint = `${road.start_lat.toFixed(5)},${road.start_lng.toFixed(5)}`;
      const endPoint = `${road.end_lat.toFixed(5)},${road.end_lng.toFixed(5)}`;
      
      // Add start point
      if (!pointMap.has(startPoint)) {
        pointMap.set(startPoint, {
          lat: road.start_lat,
          lng: road.start_lng,
          roads: [road.name]
        });
      } else {
        pointMap.get(startPoint).roads.push(road.name);
      }
      
      // Add end point
      if (!pointMap.has(endPoint)) {
        pointMap.set(endPoint, {
          lat: road.end_lat,
          lng: road.end_lng,
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
  buildGraph() {
    if (this.initialized) {
      return;
    }
    
    const roads = getMainRoads();
    
    if (!roads || roads.length === 0) {
      console.warn('No road data available to build graph');
      return;
    }
    
    console.log(`Building road graph from ${roads.length} road segments`);
    
    // Find intersections to create a more connected graph
    const intersections = this.findIntersections(roads);
    
    // Add road segments to the graph
    for (const road of roads) {
      // Create nodes for the start and end points
      const startId = `${road.start_lat.toFixed(5)},${road.start_lng.toFixed(5)}`;
      const endId = `${road.end_lat.toFixed(5)},${road.end_lng.toFixed(5)}`;
      
      const startNode = this.addNode(startId, road.start_lat, road.start_lng);
      const endNode = this.addNode(endId, road.end_lat, road.end_lng);
      
      // Add edge between start and end
      this.addEdge(startId, endId, road.name);
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
    
    // Find nearest nodes to start and end locations
    const startNearest = this.findNearestNode(startLocation);
    const endNearest = this.findNearestNode(endLocation);
    
    if (!startNearest.node || !endNearest.node) {
      console.warn('Could not find nearby road network nodes');
      return {
        success: false,
        directDistance: calculateHaversineDistance(startLocation, endLocation),
        walkingDistance: null,
        walkingTime: null,
        path: []
      };
    }
    
    // Direct distance from start to end (as the crow flies)
    const directDistance = calculateHaversineDistance(startLocation, endLocation);
    
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
        ]
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
    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest distance
      let currentId = null;
      let smallestDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          currentId = nodeId;
        }
      }
      
      // If we can't find a node or we've reached the end, break
      if (currentId === null || currentId === endNearest.node.id || smallestDistance === Infinity) {
        break;
      }
      
      // Remove current node from unvisited set
      unvisited.delete(currentId);
      
      // Get the current node
      const currentNode = this.nodes.get(currentId);
      
      // Check each neighbor
      for (const edge of currentNode.edges) {
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
    
    // Reconstruct the path
    const path = [];
    let current = endNearest.node.id;
    
    // Check if a path was found
    if (previous.get(current) === undefined && current !== startNearest.node.id) {
      console.warn('No path found between locations');
      return {
        success: false,
        directDistance: directDistance,
        walkingDistance: null,
        walkingTime: null,
        path: []
      };
    }
    
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
      if (!current) break;
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
      path: path
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
  
  if (!walkingInfo.success) {
    // Fallback to direct distance if path finding fails
    const directDistance = calculateHaversineDistance(startLocation, endLocation);
    const estimatedTime = directDistance / AVERAGE_WALKING_SPEED;
    
    return {
      minutes: Math.round(estimatedTime / 60),
      distance: Math.round(directDistance),
      isEstimate: true
    };
  }
  
  return {
    minutes: Math.round(walkingInfo.walkingTime / 60),
    distance: Math.round(walkingInfo.walkingDistance),
    isEstimate: false
  };
};

/**
 * Initialize the road graph
 * Call this at application startup to preload the graph
 */
export const initializeRoadGraph = () => {
  roadGraph.buildGraph();
};
