#!/usr/bin/env node
import dotenv from 'dotenv';
import { getRealEstateHotspots } from './analysis/hotspotAnalysis.js';
import { loadDataSources } from './data/dataLoader.js';

// Load environment variables
dotenv.config();

// Predefined Ottawa locations for analysis
const ottawaLocations = [
  {
    name: "Downtown Ottawa",
    lat: 45.4215, 
    lng: -75.6972,
    radius: 2000
  },
  {
    name: "Kanata",
    lat: 45.3088,
    lng: -75.8983,
    radius: 3000
  },
  {
    name: "Orleans",
    lat: 45.4561,
    lng: -75.5061,
    radius: 3000
  },
  {
    name: "Barrhaven",
    lat: 45.2756,
    lng: -75.7367,
    radius: 2500
  }
];

// Run analysis on all predefined locations
const runOttawaAnalysis = async () => {
  try {
    console.log('Loading Ottawa data sources...');
    await loadDataSources();
    
    console.log('\n===== OTTAWA REAL ESTATE HOTSPOT ANALYSIS =====\n');
    
    // Analyze each location
    for (const location of ottawaLocations) {
      console.log(`\n----- Analyzing ${location.name} -----`);
      console.log(`Center: (${location.lat}, ${location.lng}), Radius: ${location.radius}m\n`);
      
      const results = await getRealEstateHotspots({
        lat: location.lat,
        lng: location.lng,
        radius: location.radius
      });
      
      // Display top 3 hotspots
      console.log(`Found ${results.hotspots.length} hotspots.`);
      if (results.hotspots.length > 0) {
        console.log('\nTop 3 Hotspots:');
        results.hotspots.slice(0, 3).forEach((hotspot, index) => {
          console.log(`\n#${index + 1}: Score ${hotspot.score}/100`);
          console.log(`- Location: (${hotspot.center.lat}, ${hotspot.center.lng})`);
          console.log(`- Grocery Score: ${hotspot.details.grocery}/100`);
          console.log(`- Emergency Services Score: ${hotspot.details.emergency}/100`);
          console.log(`- Main Roads Score: ${hotspot.details.road}/100`);
        });
      } else {
        console.log('\nNo hotspots found in this area.');
      }
      
      console.log('\n' + '-'.repeat(50));
    }
    
    console.log('\nAnalysis complete!');
    
  } catch (error) {
    console.error('Error running Ottawa analysis:', error);
    process.exit(1);
  }
};

// Run the analysis
runOttawaAnalysis(); 