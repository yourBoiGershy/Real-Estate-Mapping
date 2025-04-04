#!/usr/bin/env node
import dotenv from 'dotenv';
import { getRealEstateHotspots } from './analysis/hotspotAnalysis.js';
import { getCustomRealEstateHotspots } from './analysis/customHotspotAnalysis.js';
import { loadDataSources } from './data/dataLoader.js';

// Load environment variables
dotenv.config();

// Test location (downtown Ottawa)
const testLocation = {
  name: "Downtown Ottawa",
  lat: 45.4215,
  lng: -75.6972,
  radius: 2000
};

// Helper function for performance measurement
const measurePerformance = async (fn, ...args) => {
  const start = process.hrtime.bigint();
  const result = await fn(...args);
  const end = process.hrtime.bigint();
  const time = Number(end - start) / 1_000_000; // Convert to milliseconds
  return { result, time };
};

// Print hotspot results in a formatted way
const printHotspots = (hotspots, limit = 3) => {
  if (hotspots.length === 0) {
    console.log('No hotspots found.');
    return;
  }
  
  hotspots.slice(0, limit).forEach((hotspot, index) => {
    console.log(`\n#${index + 1}: Score ${hotspot.score}/100`);
    console.log(`- Location: (${hotspot.center.lat}, ${hotspot.center.lng})`);
    console.log(`- Grocery Score: ${hotspot.details.grocery}/100`);
    console.log(`- Emergency Services Score: ${hotspot.details.emergency}/100`);
    console.log(`- Main Roads Score: ${hotspot.details.road}/100`);
  });
};

// Run comparison test
const runComparisonTest = async () => {
  try {
    console.log('Loading Ottawa data sources...');
    await loadDataSources();
    
    console.log('\n===== COMPARISON: GEOLIB VS CUSTOM IMPLEMENTATION =====\n');
    console.log(`Test Location: ${testLocation.name}`);
    console.log(`Center: (${testLocation.lat}, ${testLocation.lng}), Radius: ${testLocation.radius}m\n`);
    
    // Run geolib-based analysis
    console.log('Running geolib-based analysis...');
    const { result: geolibResults, time: geolibTime } = await measurePerformance(
      getRealEstateHotspots,
      {
        lat: testLocation.lat,
        lng: testLocation.lng,
        radius: testLocation.radius
      }
    );
    
    // Run custom analysis
    console.log('Running custom implementation analysis...');
    const { result: customResults, time: customTime } = await measurePerformance(
      getCustomRealEstateHotspots,
      {
        lat: testLocation.lat,
        lng: testLocation.lng,
        radius: testLocation.radius
      }
    );
    
    // Print results
    console.log('\n----- GEOLIB-BASED RESULTS -----');
    console.log(`Execution Time: ${geolibTime.toFixed(2)} ms`);
    console.log(`Analyzed Locations: ${geolibResults.analyzed}`);
    console.log(`Found ${geolibResults.hotspots.length} hotspots.`);
    console.log('\nTop 3 Hotspots:');
    printHotspots(geolibResults.hotspots);
    
    console.log('\n----- CUSTOM IMPLEMENTATION RESULTS -----');
    console.log(`Execution Time: ${customTime.toFixed(2)} ms`);
    console.log(`Analyzed Locations: ${customResults.analyzed}`);
    console.log(`Found ${customResults.hotspots.length} hotspots.`);
    console.log('\nTop 3 Hotspots:');
    printHotspots(customResults.hotspots);
    
    // Calculate and print differences
    const timePercentage = ((customTime - geolibTime) / geolibTime * 100).toFixed(2);
    console.log('\n----- COMPARISON SUMMARY -----');
    console.log(`Execution Time Difference: ${timePercentage}% (${customTime > geolibTime ? 'custom is slower' : 'custom is faster'})`);
    console.log(`Location Count Difference: ${Math.abs(customResults.analyzed - geolibResults.analyzed)} locations`);
    console.log(`Hotspot Count Difference: ${Math.abs(customResults.hotspots.length - geolibResults.hotspots.length)} hotspots`);
    
  } catch (error) {
    console.error('Error running comparison test:', error);
    process.exit(1);
  }
};

// Run the comparison test
runComparisonTest(); 