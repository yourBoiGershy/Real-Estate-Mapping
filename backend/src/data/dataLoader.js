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
  amenities: [],
  education: [],
  parks: [],
  restaurants: []
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
      console.warn(`Warning: File ${filePath} does not exist`);
      return resolve([]); // Return empty array if file doesn't exist
    }
    
    try {
      // Read the file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Filter out comment lines and empty lines
      const filteredLines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '' && !line.startsWith('#'));
      
      // No valid content after filtering
      if (filteredLines.length <= 1) { // Just header or nothing
        console.warn(`Warning: No valid data in ${filePath} after filtering comments`);
        return resolve([]);
      }
      
      // Extract header (first line)
      const header = filteredLines[0].split(',').map(h => h.trim());
      
      // Process data rows
      const processedData = [];
      
      for (let i = 1; i < filteredLines.length; i++) {
        const line = filteredLines[i];
        const values = line.split(',').map(v => v.trim());
        
        // Skip lines with fewer values than headers
        if (values.length < header.length) {
          console.warn(`Warning: Skipping malformed line in ${filePath}: ${line}`);
          continue;
        }
        
        const rowData = {};
        header.forEach((key, i) => {
          let value = values[i] || '';
          
          // Parse numeric values
          if (key === 'lat' || key === 'lng' || key === 'rating') {
            const parsed = parseFloat(value);
            value = isNaN(parsed) ? 0 : parsed;
          }
          
          rowData[key] = value;
        });
        
        processedData.push(rowData);
      }
      
      console.log(`Successfully parsed ${processedData.length} entries from ${path.basename(filePath)}`);
      resolve(processedData);
    } catch (error) {
      console.error(`Error loading data from ${filePath}:`, error);
      resolve([]);
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
    const educationData = await loadCsvData(process.env.EDUCATION_DATA || path.resolve(__dirname, '../../data/ottawa_education.csv'));
    const parksData = await loadCsvData(process.env.PARKS_DATA || path.resolve(__dirname, '../../data/ottawa_parks.csv'));
    const restaurantsData = await loadCsvData(process.env.RESTAURANTS_DATA || path.resolve(__dirname, '../../data/ottawa_restaurants.csv'));
    
    console.log(`Loaded ${groceryStoresData.length} grocery stores`);
    console.log(`Loaded ${emergencyServicesData.length} emergency services`);
    console.log(`Loaded ${mainRoadsData.length} main roads`);
    console.log(`Loaded ${amenitiesData.length} amenities`);
    console.log(`Loaded ${educationData.length} educational institutions`);
    console.log(`Loaded ${parksData.length} parks`);
    console.log(`Loaded ${restaurantsData.length} restaurants`);
    
    // Update the global dataStore with new data
    dataStore = {
      groceryStores: groceryStoresData || [],
      emergencyServices: emergencyServicesData || [],
      mainRoads: mainRoadsData || [],
      amenities: amenitiesData || [],
      education: educationData || [],
      parks: parksData || [],
      restaurants: restaurantsData || []
    };
    
    return dataStore;
  } catch (error) {
    console.error('Error loading data sources:', error);
    // Still update the global dataStore with empty arrays to prevent errors
    dataStore = {
      groceryStores: [],
      emergencyServices: [],
      mainRoads: [],
      amenities: [],
      education: [],
      parks: [],
      restaurants: []
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
 * Get education data
 * @returns {Array} - Education data
 */
export const getEducation = () => dataStore.education;

/**
 * Get parks data
 * @returns {Array} - Parks data
 */
export const getParks = () => dataStore.parks;

/**
 * Get restaurants data
 * @returns {Array} - Restaurants data
 */
export const getRestaurants = () => dataStore.restaurants;

/**
 * Get amenities by category
 * @param {string} category - Category name
 * @returns {Array} - Amenities in the specified category
 */
export const getAmenitiesByCategory = (category) => {
  try {
    const amenities = [...dataStore.amenities];
    
    // If the category is 'school', include education data
    if (category.toLowerCase() === 'school') {
      amenities.push(...dataStore.education);
    }
    
    // If the category is 'park', include parks data
    if (category.toLowerCase() === 'park') {
      amenities.push(...dataStore.parks);
    }
    
    // If the category is 'restaurant', include restaurants data
    if (category.toLowerCase() === 'restaurant') {
      amenities.push(...dataStore.restaurants);
    }
    
    // Filter amenities by category
    const filtered = amenities.filter(a => (a.category || '').toLowerCase() === category.toLowerCase());
    return filtered || [];
  } catch (error) {
    console.error(`Error getting amenities for category ${category}:`, error);
    return [];
  }
}; 