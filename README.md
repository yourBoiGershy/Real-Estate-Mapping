# Ottawa Real Estate Hotspot Analysis

A comprehensive tool for analyzing real estate locations in Ottawa based on proximity to essential amenities, livability factors, and mobility options.

This project uses custom GIS algorithms to provide detailed scores for any address in Ottawa, including:

- **Overall Score**: Combined rating of all factors
- **Mobility Score**: Access to transit stations, bus stops, and major roads
- **Livability Score**: Proximity to retail, restaurants, entertainment, parks, and schools
- **Emergency Services Score**: Access to hospitals, police stations, and fire stations
- **Grocery Store Score**: Proximity to grocery options

## Project Structure

This is a monorepo containing:

- **Backend**: Node.js API with custom GIS analysis functions
- **Frontend**: React application with interactive map

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd real-estate-mapping

# Install dependencies
npm install
```

## Running the Application

```bash
# Start both frontend and backend
npm start

# Run only the backend
npm run start:backend

# Run only the frontend
npm run start:frontend
```

## Analyzing an Address via Command Line

```bash
npm run analyze-address "240 Sparks St, Ottawa"
```

## Features

- Analyzes proximity to grocery stores, emergency services, and main roads in Ottawa
- Generates a desirability score for potential real estate locations
- Identifies "hotspots" for real estate investment
- Includes livability analysis based on nearby retail, restaurants, entertainment, parks, and schools
- Works as both a command-line tool and a web API
- Uses real-world data for Ottawa's fire stations, hospitals, police stations, grocery stores, and major roads
- Implements custom GIS functionality for geo-spatial calculations

## Data Sources

The application uses CSV data files with real Ottawa locations stored in the `data` directory:

- `ottawa_grocery_stores.csv`: Major grocery stores in Ottawa
- `ottawa_emergency_services.csv`: Fire stations, hospitals, and police stations in Ottawa
- `ottawa_main_roads.csv`: Major roads and highways in Ottawa

## Usage

### Command Line Interface

Run the analysis from the command line:

```bash
node src/cli.js <latitude> <longitude> [radius]
```

Example (analyzing downtown Ottawa):
```bash
node src/cli.js 45.4215 -75.6972 3000
```

### Ottawa-specific Analysis

Analyze predefined locations in Ottawa:

```bash
npm run ottawa
```

### Livability Analysis

Get detailed livability analysis for Ottawa neighborhoods:

```bash
npm run livability
```

For a custom location:

```bash
npm run livability -- 45.4215 -75.6972 3000 "Custom Location Name"
```

### Address Analysis

Analyze any Ottawa address with comprehensive scoring:

```bash
npm run analyze-address "123 Main St, Ottawa"
```

The analysis provides:
- Mobility score (transit stations, bus stops, main roads)
- Livability score (retail, restaurants, entertainment, parks, schools)
- Emergency services access score
- Grocery store proximity score
- Comprehensive overall score

### Web API

Start the API server:

```bash
npm start
```

Make requests to the API:

```
GET /api/hotspots?lat=45.4215&lng=-75.6972&radius=3000
```

## Scoring Methodology

The desirability score is calculated based on:

- **Grocery Store Score (40%)**: Based on proximity to the closest grocery store
- **Emergency Services Score (40%)**: Based on proximity to hospitals, police stations, and fire stations
- **Main Roads Score (20%)**: Based on proximity to main roads

Each factor is scored from 0-100, and the weighted average is calculated for the overall score.

### Livability Score

The livability score is a separate measure that evaluates the quality of life in an area based on:

- **Retail (20%)**: Proximity and quality of shopping options
- **Restaurants (25%)**: Variety and quality of dining options
- **Entertainment (20%)**: Availability of entertainment venues
- **Parks (20%)**: Access to green spaces and recreational areas
- **Schools (15%)**: Proximity to educational institutions

### Mobility Score

The mobility score evaluates transportation accessibility:

- **Transit Stations (50%)**: Proximity to O-Train and major transit stations
- **Bus Stops (30%)**: Accessibility to regular bus service
- **Main Roads (20%)**: Access to major roads and highways

The combined score merges traditional analysis with livability and mobility scores for a comprehensive evaluation.

## Custom Implementation

This project includes custom implementations of geographic calculations rather than relying solely on existing GIS libraries:

- Custom implementation of the Haversine formula for distance calculations
- Custom point-to-line distance algorithm for road proximity
- Custom grid generation algorithm for analyzing locations
- Custom scoring methodology for livability analysis

## Future Enhancements

- Incorporate property price and valuation data
- Add more factors such as public transport and crime statistics
- Develop a web-based visualization interface
- Allow customization of scoring weights
- Integrate with real APIs for up-to-date amenity data

## License

ISC