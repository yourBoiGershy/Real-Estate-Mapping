import React from 'react';
import ScoreDisplay from './ScoreDisplay';
import { AddressAnalysisResponse } from '../types/address-analysis';

interface ResultsDisplayProps {
  results: AddressAnalysisResponse;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  const { scores } = results;
  const { overallScore, mobility, livability, emergencyServices } = scores;

  return (
    <div className="results-container">
      <div className="results-card">
        <ScoreDisplay score={overallScore} label="Overall Score" />
        
        <div className="score-section">
          <ScoreDisplay score={mobility.score} label="Mobility Score" />
          <div className="score-details">
            <ul>
              <li>Transit Station: {mobility.transitStationScore}/100 
                {mobility.nearestTransitStation && 
                  ` - Nearest: ${mobility.nearestTransitStation.name} (${mobility.nearestTransitStation.distance}m away)`
                }
              </li>
              <li>Bus Stop: {mobility.busStopScore}/100
                {mobility.nearestBusStop &&
                  ` - Nearest: ${mobility.nearestBusStop.distance}m away`
                }
              </li>
              <li>Road Access: {mobility.roadAccessScore}/100
                {mobility.nearestMainRoad &&
                  ` - Nearest: ${mobility.nearestMainRoad.name} (${mobility.nearestMainRoad.distance}m away)`
                }
              </li>
            </ul>
          </div>
        </div>
        
        <div className="score-section">
          <ScoreDisplay score={livability.score} label="Livability Score" />
          <div className="score-details">
            <ul>
              <li>Restaurants: {livability.categoryScores.restaurant}/100</li>
              <li>Entertainment: {livability.categoryScores.entertainment}/100</li>
              <li>Parks: {livability.categoryScores.park}/100</li>
              <li>Schools: {livability.categoryScores.school}/100</li>
            </ul>
          </div>
        </div>
        
        <div className="score-section">
          <ScoreDisplay score={emergencyServices.score} label="Emergency Services Score" />
          <div className="score-details">
            <ul>
              <li>Medical: {emergencyServices.medical.score}/100</li>
              <li>Fire: {emergencyServices.fire.score}/100</li>
              <li>Police: {emergencyServices.police.score}/100</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay; 