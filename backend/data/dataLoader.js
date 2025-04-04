import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Create a global data container that will be updated by loadDataSources
let dataStore = {
  groceryStores: [],
  emergencyServices: [],
  mainRoads: [],
  amenities: []
};

// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load CSV data from a file
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} - Parsed data
 */
const loadCsvData = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return resolve([]); // Return empty array if file doesn't exist
    }
    
    try {
      // Read the file content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Filter out comment lines (starting with #) and empty lines
      const filteredContent = fileContent
        .split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .join('\n');
      
      // Create a readable stream from the filtered content
      const readableStream = require('stream').Readable.from([filteredContent]);
      
      readableStream
        .pipe(csv())
        .on('data', (data) => {
          // Make sure all data has proper types
          if (data.lat) data.lat = parseFloat(data.lat);
          if (data.lng) data.lng = parseFloat(data.lng);
          if (data.rating) data.rating = parseFloat(data.rating);
          
          results.push(data);
        })
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    } catch (error) {
      console.error(`Error processing CSV file ${filePath}:`, error);
      resolve([]); // Return empty array on error
    }
  });
};

/**
 * Load all data sources from CSV files
 * @returns {Object} - Object containing all data sources
 */
export const loadDataSources = async () => {
  try {
    // Load data from CSV files
    const groceryStoresData = await loadCsvData(process.env.GROCERY_STORES_DATA || path.resolve(__dirname, '../../data/ottawa_grocery_stores.csv'));
    const emergencyServicesData = await loadCsvData(process.env.EMERGENCY_SERVICES_DATA || path.resolve(__dirname, '../../data/ottawa_emergency_services.csv'));
    const mainRoadsData = await loadCsvData(process.env.MAIN_ROADS_DATA || path.resolve(__dirname, '../../data/ottawa_main_roads.csv'));
    const amenitiesData = await loadCsvData(process.env.AMENITIES_DATA || path.resolve(__dirname, '../../data/ottawa_amenities.csv'));
    
    console.log(`Loaded ${groceryStoresData.length} grocery stores from file`);
    console.log(`Loaded ${emergencyServicesData.length} emergency services from file`);
    console.log(`Loaded ${mainRoadsData.length} main roads from file`);
    console.log(`Loaded ${amenitiesData.length} amenities from file`);
    
    // Update the global dataStore with new data
    dataStore = {
      groceryStores: groceryStoresData || [],
      emergencyServices: emergencyServicesData || [],
      mainRoads: mainRoadsData || [],
      amenities: amenitiesData || []
    };
    
    return dataStore;
  } catch (error) {
    console.error('Error loading data sources:', error);
    // Still update the global dataStore with empty arrays to prevent errors
    dataStore = {
      groceryStores: [],
      emergencyServices: [],
      mainRoads: [],
      amenities: []
    };
    return dataStore;
  }
};

/**
 * Get grocery stores data
 * @returns {Array} - Grocery stores data
 */
export const getGroceryStores = () => dataStore.groceryStores;

/**
 * Get emergency services data
 * @returns {Array} - Emergency services data
 */
export const getEmergencyServices = () => dataStore.emergencyServices;

/**
 * Get main roads data
 * @returns {Array} - Main roads data
 */
export const getMainRoads = () => dataStore.mainRoads;

/**
 * Get amenities data
 * @returns {Array} - Amenities data
 */
export const getAmenities = () => dataStore.amenities;

/**
 * Get amenities by category
 * @param {string} category - Category name
 * @returns {Array} - Amenities in the specified category
 */
export const getAmenitiesByCategory = (category) => {
  try {
    const amenities = dataStore.amenities;
    
    // Filter amenities by category
    const filtered = amenities.filter(a => (a.category || '').toLowerCase() === category.toLowerCase());
    return filtered || [];
  } catch (error) {
    console.error(`Error getting amenities for category ${category}:`, error);
    return [];
  }
}; 