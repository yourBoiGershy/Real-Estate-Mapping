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
                {mobility.nearestTransitStation && (
                  <span>
                    {` - Nearest: ${mobility.nearestTransitStation.name} (${mobility.nearestTransitStation.distance}m away)`}
                    {mobility.nearestTransitStation.walkingTime && (
                      <span className="walking-time">
                        {` - Walking time: ${mobility.nearestTransitStation.walkingTime.minutes} min`}
                        {mobility.nearestTransitStation.walkingTime.isEstimate && " (estimated)"}
                      </span>
                    )}
                    {mobility.nearestTransitStation.drivingTime && (
                      <span className="driving-time">
                        {` - Driving time: ${mobility.nearestTransitStation.drivingTime.minutes} min`}
                        {mobility.nearestTransitStation.drivingTime.isEstimate && " (estimated)"}
                      </span>
                    )}
                  </span>
                )}
              </li>
              <li>Bus Stop: {mobility.busStopScore}/100
                {mobility.nearestBusStop && (
                  <span>
                    {` - Nearest: ${mobility.nearestBusStop.distance}m away`}
                    {mobility.nearestBusStop.walkingTime && (
                      <span className="walking-time">
                        {` - Walking time: ${mobility.nearestBusStop.walkingTime.minutes} min`}
                        {mobility.nearestBusStop.walkingTime.isEstimate && " (estimated)"}
                      </span>
                    )}
                    {mobility.nearestBusStop.drivingTime && (
                      <span className="driving-time">
                        {` - Driving time: ${mobility.nearestBusStop.drivingTime.minutes} min`}
                        {mobility.nearestBusStop.drivingTime.isEstimate && " (estimated)"}
                      </span>
                    )}
                  </span>
                )}
              </li>
              <li>Road Access: {mobility.roadAccessScore}/100
                {mobility.nearestMainRoad && (
                  <span>
                    {` - Nearest: ${mobility.nearestMainRoad.name} (${mobility.nearestMainRoad.distance}m away)`}
                    {mobility.nearestMainRoad.walkingTime && (
                      <span className="walking-time">
                        {` - Walking time: ${mobility.nearestMainRoad.walkingTime.minutes} min`}
                        {mobility.nearestMainRoad.walkingTime.isEstimate && " (estimated)"}
                      </span>
                    )}
                    {mobility.nearestMainRoad.drivingTime && (
                      <span className="driving-time">
                        {` - Driving time: ${mobility.nearestMainRoad.drivingTime.minutes} min`}
                        {mobility.nearestMainRoad.drivingTime.isEstimate && " (estimated)"}
                      </span>
                    )}
                  </span>
                )}
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