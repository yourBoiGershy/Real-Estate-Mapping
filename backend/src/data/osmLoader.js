/**
 * OpenStreetMap data loader
 * Handles downloading, parsing, and processing OSM data for Ottawa
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import osmRead from 'osm-read';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store OSM data
const OSM_DATA_PATH = path.resolve(__dirname, '../../data/ottawa_osm.xml');

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Ottawa bounding box (approximate)
const OTTAWA_BOUNDS = {
  south: 45.2,
  west: -76.0,
  north: 45.5,
  east: -75.5
};

// Store the road network data
let roadNetworkData = {
  nodes: new Map(),
  ways: [],
  initialized: false
};

/**
 * Download OSM data for Ottawa using Overpass API
 * @returns {Promise<string>} - Path to the downloaded file
 */
export const downloadOsmData = async () => {
  try {
    console.log('Downloading OpenStreetMap data for Ottawa...');
    
    // Create Overpass query for roads in Ottawa
    const query = `
      [out:xml][timeout:300];
      (
        way["highway"](${OTTAWA_BOUNDS.south},${OTTAWA_BOUNDS.west},${OTTAWA_BOUNDS.north},${OTTAWA_BOUNDS.east});
        >;
      );
      out body;
    `;
    
    // Check if file already exists
    if (fs.existsSync(OSM_DATA_PATH)) {
      const stats = fs.statSync(OSM_DATA_PATH);
      const fileSizeInMB = stats.size / (1024 * 1024);
      const fileAgeInDays = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
      
      // If file is recent (less than 30 days old) and not empty, use it
      if (fileAgeInDays < 30 && fileSizeInMB > 1) {
        console.log(`Using existing OSM data (${fileSizeInMB.toFixed(2)} MB, ${fileAgeInDays.toFixed(1)} days old)`);
        return OSM_DATA_PATH;
      }
    }
    
    // Download data from Overpass API
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download OSM data: ${response.statusText}`);
    }
    
    // Save data to file
    const data = await response.text();
    fs.writeFileSync(OSM_DATA_PATH, data);
    
    console.log(`Downloaded OSM data to ${OSM_DATA_PATH}`);
    return OSM_DATA_PATH;
  } catch (error) {
    console.error('Error downloading OSM data:', error);
    throw error;
  }
};

/**
 * Parse OSM data and build road network
 * @param {string} osmFilePath - Path to OSM data file
 * @returns {Promise<Object>} - Road network data
 */
export const parseOsmData = async (osmFilePath = OSM_DATA_PATH) => {
  try {
    console.log(`Parsing OSM data from ${osmFilePath}...`);
    
    // Check if file exists
    if (!fs.existsSync(osmFilePath)) {
      console.log('OSM data file not found, downloading...');
      osmFilePath = await downloadOsmData();
    }
    
    // Reset road network data
    roadNetworkData = {
      nodes: new Map(),
      ways: [],
      initialized: false
    };
    
    // Parse OSM data
    return new Promise((resolve, reject) => {
      // First pass: collect all nodes
      osmRead.parse({
        filePath: osmFilePath,
        endDocument: () => {
          console.log(`Parsed ${roadNetworkData.nodes.size} nodes`);
          
          // Second pass: collect all ways (roads)
          osmRead.parse({
            filePath: osmFilePath,
            way: (way) => {
              // Check if this way is a road
              if (way.tags && way.tags.highway) {
                const roadType = way.tags.highway;
                const name = way.tags.name || 'Unnamed Road';
                const oneway = way.tags.oneway === 'yes';
                const maxspeed = way.tags.maxspeed ? parseInt(way.tags.maxspeed, 10) : null;
                
                // Create road segments from consecutive nodes
                const nodes = [];
                for (const nodeId of way.nodeRefs) {
                  if (roadNetworkData.nodes.has(nodeId)) {
                    nodes.push(roadNetworkData.nodes.get(nodeId));
                  }
                }
                
                if (nodes.length >= 2) {
                  roadNetworkData.ways.push({
                    id: way.id,
                    name,
                    type: roadType,
                    oneway,
                    maxspeed,
                    nodes
                  });
                }
              }
            },
            endDocument: () => {
              console.log(`Parsed ${roadNetworkData.ways.length} road segments`);
              roadNetworkData.initialized = true;
              resolve(roadNetworkData);
            },
            error: (error) => {
              reject(error);
            }
          });
        },
        node: (node) => {
          roadNetworkData.nodes.set(node.id, {
            id: node.id,
            lat: node.lat,
            lng: node.lon
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error parsing OSM data:', error);
    throw error;
  }
};

/**
 * Get road network data
 * @returns {Promise<Object>} - Road network data
 */
export const getRoadNetworkData = async () => {
  if (!roadNetworkData.initialized) {
    await parseOsmData();
  }
  return roadNetworkData;
};

/**
 * Convert OSM road network to a format compatible with our routing algorithm
 * @returns {Promise<Array>} - Array of road segments
 */
export const getOsmRoads = async () => {
  const roadNetwork = await getRoadNetworkData();
  
  // Convert to our road segment format
  const roads = [];
  
  for (const way of roadNetwork.ways) {
    // Create road segments from consecutive nodes
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const startNode = way.nodes[i];
      const endNode = way.nodes[i + 1];
      
      // Determine road speed based on type
      let speedKmh = 50; // Default speed
      
      if (way.maxspeed) {
        speedKmh = way.maxspeed;
      } else {
        // Estimate speed based on road type
        switch (way.type) {
          case 'motorway':
          case 'motorway_link':
            speedKmh = 100;
            break;
          case 'trunk':
          case 'trunk_link':
            speedKmh = 80;
            break;
          case 'primary':
          case 'primary_link':
            speedKmh = 60;
            break;
          case 'secondary':
          case 'secondary_link':
            speedKmh = 50;
            break;
          case 'tertiary':
          case 'tertiary_link':
            speedKmh = 40;
            break;
          case 'residential':
          case 'living_street':
            speedKmh = 30;
            break;
          case 'service':
            speedKmh = 20;
            break;
          case 'footway':
          case 'path':
          case 'pedestrian':
          case 'steps':
            speedKmh = 5; // Walking speed
            break;
          default:
            speedKmh = 50;
        }
      }
      
      // Create road segment
      roads.push({
        name: way.name,
        start_lat: startNode.lat,
        start_lng: startNode.lng,
        end_lat: endNode.lat,
        end_lng: endNode.lng,
        type: way.type,
        oneway: way.oneway,
        speed: speedKmh,
        id: `${way.id}-${i}`
      });
      
      // If not one-way, add reverse segment
      if (!way.oneway) {
        roads.push({
          name: way.name,
          start_lat: endNode.lat,
          start_lng: endNode.lng,
          end_lat: startNode.lat,
          end_lng: startNode.lng,
          type: way.type,
          oneway: way.oneway,
          speed: speedKmh,
          id: `${way.id}-${i}-rev`
        });
      }
    }
  }
  
  console.log(`Converted ${roadNetwork.ways.length} OSM ways to ${roads.length} road segments`);
  return roads;
};
