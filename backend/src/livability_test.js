#!/usr/bin/env node
import dotenv from 'dotenv';
import { loadDataSources } from './data/dataLoader.js';
import { getLivabilityScore } from './analysis/livabilityAnalysis.js';
import { getRealEstateHotspots } from './analysis/hotspotAnalysis.js';

// Load environment variables
dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Print colored score
const printScore = (score) => {
  let color = colors.red;
  if (score >= 80) {
    color = colors.green;
  } else if (score >= 60) {
    color = colors.yellow;
  } else if (score >= 40) {
    color = colors.magenta;
  }
  return `${color}${score}${colors.reset}`;
};

// Print rating stars
const printStars = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
  return (
    colors.yellow + '★'.repeat(fullStars) + 
    (halfStar ? '½' : '') + 
    colors.dim + '☆'.repeat(emptyStars) + 
    colors.reset
  );
};

// Test locations
const testLocations = [
  {
    name: "Downtown Ottawa",
    lat: 45.4215,
    lng: -75.6972,
    radius: 3000
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
    radius: 3000
  }
];

// Print livability details
const printLivabilityDetails = (livabilityData) => {
  console.log(`\n${colors.bright}${colors.cyan}LIVABILITY SCORE: ${printScore(livabilityData.overallScore)}/100${colors.reset}\n`);
  
  // Print category scores
  console.log(`${colors.bright}Category Scores:${colors.reset}`);
  console.log(`${colors.bright}RETAIL:${colors.reset} ${printScore(livabilityData.categoryScores.retail.score)}/100 (${livabilityData.categoryScores.retail.count} places, avg ${livabilityData.categoryScores.retail.averageDistance}m away, rating ${livabilityData.categoryScores.retail.averageRating})`);
  console.log(`${colors.bright}RESTAURANTS:${colors.reset} ${printScore(livabilityData.categoryScores.restaurant.score)}/100 (${livabilityData.categoryScores.restaurant.count} places, avg ${livabilityData.categoryScores.restaurant.averageDistance}m away, rating ${livabilityData.categoryScores.restaurant.averageRating})`);
  console.log(`${colors.bright}ENTERTAINMENT:${colors.reset} ${printScore(livabilityData.categoryScores.entertainment.score)}/100 (${livabilityData.categoryScores.entertainment.count} places, avg ${livabilityData.categoryScores.entertainment.averageDistance}m away, rating ${livabilityData.categoryScores.entertainment.averageRating})`);
  console.log(`${colors.bright}PARKS:${colors.reset} ${printScore(livabilityData.categoryScores.park.score)}/100 (${livabilityData.categoryScores.park.count} places, avg ${livabilityData.categoryScores.park.averageDistance}m away, rating ${livabilityData.categoryScores.park.averageRating})`);
  console.log(`${colors.bright}SCHOOLS:${colors.reset} ${printScore(livabilityData.categoryScores.school.score)}/100 (${livabilityData.categoryScores.school.count} places, avg ${livabilityData.categoryScores.school.averageDistance}m away, rating ${livabilityData.categoryScores.school.averageRating})`);
  
  // Print nearby places by category
  const printCategory = (category, title) => {
    const items = livabilityData.categoryScores[category].items;
    if (!items || items.length === 0) {
      return;
    }
    
    console.log(`\n${colors.bright}${colors.underline}Nearby ${title}:${colors.reset}`);
    items.forEach((item, i) => {
      console.log(`  ${i+1}. ${colors.bright}${item.name}${colors.reset} - ${item.distance}m away ${printStars(item.rating)}`);
    });
  };
  
  printCategory('retail', 'Retail');
  printCategory('restaurant', 'Restaurants');
  printCategory('entertainment', 'Entertainment');
  printCategory('park', 'Parks');
  printCategory('school', 'Schools');
};

// Main function
const runLivabilityTest = async () => {
  try {
    console.log('Loading data sources...');
    await loadDataSources();
    
    console.log('\n===== OTTAWA LIVABILITY ANALYSIS =====\n');
    
    // Parse command line arguments if provided
    const args = process.argv.slice(2);
    let locations = testLocations;
    
    if (args.length >= 2) {
      // Use command line arguments for lat/lng
      const lat = parseFloat(args[0]);
      const lng = parseFloat(args[1]);
      const radius = args[2] ? parseInt(args[2]) : 3000;
      const name = args[3] || 'Custom Location';
      
      if (isNaN(lat) || isNaN(lng)) {
        console.error('Invalid latitude or longitude. Please provide valid numbers.');
        process.exit(1);
      }
      
      locations = [{
        name,
        lat,
        lng,
        radius
      }];
    }
    
    // Analyze each location
    for (const location of locations) {
      console.log(`\n${colors.bright}${colors.bgCyan}${colors.black} ANALYZING ${location.name.toUpperCase()} ${colors.reset}`);
      console.log(`${colors.dim}Location: (${location.lat}, ${location.lng}), Radius: ${location.radius}m${colors.reset}\n`);
      
      // Get livability data
      const livabilityData = await getLivabilityScore(location);
      printLivabilityDetails(livabilityData);
      
      // Find hotspots including livability
      const hotspotResults = await getRealEstateHotspots({
        lat: location.lat,
        lng: location.lng,
        radius: location.radius,
        includeLivability: true
      });
      
      // Print top hotspot details if available
      if (hotspotResults.hotspots.length > 0) {
        const topHotspot = hotspotResults.hotspots[0];
        
        console.log(`\n${colors.bright}${colors.underline}TOP REAL ESTATE HOTSPOT NEAR ${location.name.toUpperCase()}:${colors.reset}`);
        console.log(`Location: (${topHotspot.center.lat}, ${topHotspot.center.lng})`);
        
        if (topHotspot.combinedScore) {
          console.log(`${colors.bright}COMBINED SCORE: ${printScore(topHotspot.combinedScore)}/100${colors.reset}`);
          console.log(`Traditional Score: ${printScore(topHotspot.score)}/100`);
          console.log(`Livability Score: ${printScore(topHotspot.livabilityScore)}/100`);
          
          // Print the top amenities of each category
          const categories = ['retail', 'restaurant', 'entertainment', 'park', 'school'];
          
          for (const category of categories) {
            if (topHotspot.livabilityDetails && 
                topHotspot.livabilityDetails[category] && 
                topHotspot.livabilityDetails[category].places && 
                topHotspot.livabilityDetails[category].places.length > 0) {
              
              const topPlace = topHotspot.livabilityDetails[category].places[0];
              console.log(`Top ${category}: ${colors.bright}${topPlace.name}${colors.reset} (${topPlace.distance}m, ${printStars(topPlace.rating)})`);
            }
          }
        } else {
          console.log(`Score: ${printScore(topHotspot.score)}/100`);
        }
      }
      
      console.log('\n' + '-'.repeat(60));
    }
    
    console.log('\nAnalysis complete!');
    
  } catch (error) {
    console.error('Error running livability test:', error);
    process.exit(1);
  }
};

// Run the analysis
runLivabilityTest(); 