#!/usr/bin/env node
import dotenv from 'dotenv';
import { getRealEstateHotspots } from './analysis/hotspotAnalysis.js';
import { loadDataSources } from './data/dataLoader.js';

// Load environment variables
dotenv.config();

// CLI arguments
const args = process.argv.slice(2);
const usage = `
Real Estate Hotspot Analysis Tool

Usage:
  node src/cli.js <lat> <lng> [radius]

Arguments:
  lat     Latitude of center point
  lng     Longitude of center point
  radius  Analysis radius in meters (default: 5000)

Example:
  node src/cli.js 37.7749 -122.4194 2000
`;

// Parse arguments
if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(1);
}

const lat = parseFloat(args[0]);
const lng = parseFloat(args[1]);
const radius = args[2] ? parseInt(args[2]) : 5000;

// Validate inputs
if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
  console.error('Error: Latitude, longitude, and radius must be valid numbers');
  console.log(usage);
  process.exit(1);
}

// Run analysis
(async () => {
  try {
    console.log('Loading data sources...');
    await loadDataSources();
    
    console.log(`Analyzing area around (${lat}, ${lng}) with a radius of ${radius}m...`);
    const results = await getRealEstateHotspots({ lat, lng, radius });
    
    console.log('\nAnalysis Results:');
    console.log(`- Center: (${results.center.lat}, ${results.center.lng})`);
    console.log(`- Radius: ${results.radius}m`);
    console.log(`- Analyzed locations: ${results.analyzed}`);
    console.log(`- Found ${results.hotspots.length} hotspots`);
    
    if (results.hotspots.length > 0) {
      console.log('\nTop Hotspots:');
      results.hotspots.forEach((hotspot, index) => {
        console.log(`\n#${index + 1}: Score ${hotspot.score}/100`);
        console.log(`- Location: (${hotspot.center.lat}, ${hotspot.center.lng})`);
        console.log(`- Grocery Score: ${hotspot.details.grocery}/100`);
        console.log(`- Emergency Services Score: ${hotspot.details.emergency}/100`);
        console.log(`- Main Roads Score: ${hotspot.details.road}/100`);
      });
    } else {
      console.log('\nNo hotspots found in the specified area.');
    }
  } catch (error) {
    console.error('Error running analysis:', error);
    process.exit(1);
  }
})(); 