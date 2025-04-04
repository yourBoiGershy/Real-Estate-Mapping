import React, { useState, useEffect } from 'react';
import { MapComponent } from './MapComponent';
import './SearchResults.css';
import { AddressAnalysisResponse, Place } from '../types/address-analysis';

interface SearchResultsProps {
  address: string;
  results: AddressAnalysisResponse | null;
  loading: boolean;
  error: string | null;
}

const SearchResults: React.FC<SearchResultsProps> = ({ address, results, loading, error }) => {
  const [allNearbyPlaces, setAllNearbyPlaces] = useState<Place[]>([]);
  
  // Collect all nearby places for the map
  useEffect(() => {
    if (results) {
      const places: Place[] = [];
      
      // Add emergency services
      if (results.scores?.emergencyServices) {
        const es = results.scores.emergencyServices;
        // Add hospitals
        if (es.medical?.hospitals) {
          places.push(...es.medical.hospitals.map(h => ({ ...h, type: 'hospital' })));
        }
        // Add fire stations
        if (es.fire?.stations) {
          places.push(...es.fire.stations.map(s => ({ ...s, type: 'fire' })));
        }
        // Add police stations
        if (es.police?.stations) {
          places.push(...es.police.stations.map(s => ({ ...s, type: 'police' })));
        }
      }
      
      // Add places from livability categories
      if (results.scores?.livability?.places) {
        const livability = results.scores.livability;
        
        // Add restaurants from livability
        if (livability.places.restaurant) {
          places.push(...livability.places.restaurant.map(p => ({ ...p, type: 'restaurant' })));
        }
        
        // Add entertainment places
        if (livability.places.entertainment) {
          places.push(...livability.places.entertainment.map(p => ({ ...p, type: 'entertainment' })));
        }
        
        // Add parks
        if (livability.places.park) {
          places.push(...livability.places.park.map(p => ({ ...p, type: 'park' })));
        }
        
        // Add schools
        if (livability.places.school) {
          places.push(...livability.places.school.map(p => ({ ...p, type: 'school' })));
        }
        
        // Add grocery stores
        if (livability.places.grocery) {
          places.push(...livability.places.grocery.map(p => ({ ...p, type: 'grocery' })));
        }
      }
      
      setAllNearbyPlaces(places);
    }
  }, [results]);

  if (loading) {
    return <div className="search-results loading">Analyzing address...</div>;
  }

  if (error) {
    return <div className="search-results error">{error}</div>;
  }

  if (!results) {
    return null;
  }

  // Helper function to render the score bar
  const renderScoreBar = (score: number) => {
    const scoreClass = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'average' : 'poor';
    
    return (
      <div className="score-bar-container">
        <div className={`score-bar ${scoreClass}`} style={{ width: `${score}%` }}></div>
        <span className="score-value">{score}/100</span>
      </div>
    );
  };

  // Helper function to render places list
  const renderPlacesList = (places: Place[] | undefined) => {
    if (!places || places.length === 0) {
      return <p>No nearby places found</p>;
    }

    return (
      <ul className="places-list">
        {places.slice(0, 5).map((place, index) => (
          <li key={index} className="place-item">
            <strong>{place.name || 'Unnamed place'}</strong>
            <p>{place.address || 'Address not available'}</p>
            {place.distance !== undefined && (
              <p>Distance: {(place.distance / 1000).toFixed(2)} km</p>
            )}
            {place.rating !== undefined && (
              <p>Rating: {place.rating}/5</p>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // Make sure lat, lng and coordinates exist before trying to use them
  const lat = results?.lat;
  const lng = results?.lng;
  const geocodedAddress = results?.geocodedAddress || 'Address details not available';
  const scores = results?.scores;
  
  if (!lat || !lng || !scores) {
    return <div className="search-results error">Invalid response data received. Missing coordinates or scores.</div>;
  }

  return (
    <div className="search-results">
      <div className="address-header">
        <h2>{geocodedAddress}</h2>
        <p className="coordinates">
          Latitude: {lat.toFixed(6)}, Longitude: {lng.toFixed(6)}
        </p>
      </div>
      
      <div className="overall-score">
        <h3>Overall Score: {scores.overallScore}/100</h3>
        {renderScoreBar(scores.overallScore)}
      </div>
      
      <div className="results-container">
        <div className="scores-panel">
          {scores.mobility && (
            <div className="score-section mobility-section">
              <h3>Mobility Score: {scores.mobility.score}/100</h3>
              {renderScoreBar(scores.mobility.score)}
              
              <div className="sub-scores">
                <div className="sub-score">
                  <h4>Transit Station: {scores.mobility.transitStationScore}/100</h4>
                  {renderScoreBar(scores.mobility.transitStationScore)}
                  {scores.mobility.nearestTransitStation && (
                    <p>Nearest: {scores.mobility.nearestTransitStation.name}, 
                      {(scores.mobility.nearestTransitStation.distance / 1000).toFixed(2)} km</p>
                  )}
                </div>
                
                <div className="sub-score">
                  <h4>Bus Stop: {scores.mobility.busStopScore}/100</h4>
                  {renderScoreBar(scores.mobility.busStopScore)}
                  {scores.mobility.nearestBusStop && (
                    <p>Nearest: Stop #{scores.mobility.nearestBusStop.id}, 
                      {(scores.mobility.nearestBusStop.distance / 1000).toFixed(2)} km</p>
                  )}
                </div>
                
                <div className="sub-score">
                  <h4>Road Access: {scores.mobility.roadAccessScore}/100</h4>
                  {renderScoreBar(scores.mobility.roadAccessScore)}
                  {scores.mobility.nearestMainRoad && (
                    <p>Nearest: {scores.mobility.nearestMainRoad.name}, 
                      {(scores.mobility.nearestMainRoad.distance / 1000).toFixed(2)} km</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {scores.livability && (
            <div className="score-section livability-section">
              <h3>Livability Score: {scores.livability.score}/100</h3>
              {renderScoreBar(scores.livability.score)}
              
              <div className="category-accordion">
                {scores.livability.categoryScores && Object.entries(scores.livability.categoryScores).map(([key, score]) => (
                  <details key={key} className={`category-details ${key}`}>
                    <summary>
                      {key.charAt(0).toUpperCase() + key.slice(1)}: {score}/100
                      {renderScoreBar(score)}
                    </summary>
                    {renderPlacesList(scores.livability.places[key as keyof typeof scores.livability.places])}
                  </details>
                ))}
              </div>
            </div>
          )}
          
          {scores.emergencyServices && (
            <div className="score-section emergency-section">
              <h3>Emergency Services: {scores.emergencyServices.score}/100</h3>
              {renderScoreBar(scores.emergencyServices.score)}
              
              <div className="sub-scores">
                <div className="sub-score medical-services">
                  <h4>Medical Services: {scores.emergencyServices.medical.score}/100</h4>
                  {renderScoreBar(scores.emergencyServices.medical.score)}
                  {scores.emergencyServices.medical.nearest && (
                    <p>Nearest: {scores.emergencyServices.medical.nearest.name}, 
                      {(scores.emergencyServices.medical.nearest.distance / 1000).toFixed(2)} km</p>
                  )}
                  <details className="category-details">
                    <summary>Nearby Hospitals</summary>
                    {renderPlacesList(scores.emergencyServices.medical.hospitals)}
                  </details>
                </div>
                
                <div className="sub-score fire-services">
                  <h4>Fire Services: {scores.emergencyServices.fire.score}/100</h4>
                  {renderScoreBar(scores.emergencyServices.fire.score)}
                  {scores.emergencyServices.fire.nearest && (
                    <p>Nearest: {scores.emergencyServices.fire.nearest.name}, 
                      {(scores.emergencyServices.fire.nearest.distance / 1000).toFixed(2)} km</p>
                  )}
                  <details className="category-details">
                    <summary>Nearby Fire Stations</summary>
                    {renderPlacesList(scores.emergencyServices.fire.stations)}
                  </details>
                </div>
                
                <div className="sub-score police-services">
                  <h4>Police Services: {scores.emergencyServices.police.score}/100</h4>
                  {renderScoreBar(scores.emergencyServices.police.score)}
                  {scores.emergencyServices.police.nearest && (
                    <p>Nearest: {scores.emergencyServices.police.nearest.name}, 
                      {(scores.emergencyServices.police.nearest.distance / 1000).toFixed(2)} km</p>
                  )}
                  <details className="category-details">
                    <summary>Nearby Police Stations</summary>
                    {renderPlacesList(scores.emergencyServices.police.stations)}
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="map-container">
          <MapComponent 
            latitude={lat} 
            longitude={lng} 
            address={geocodedAddress}
            nearbyPlaces={allNearbyPlaces} 
          />
        </div>
      </div>
    </div>
  );
};

export default SearchResults; 