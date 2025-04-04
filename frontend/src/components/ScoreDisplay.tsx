import React from 'react';

interface ScoreDisplayProps {
  score: number;
  label: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, label }) => {
  // Determine score class based on value
  const getScoreClass = () => {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-poor';
  };

  return (
    <div className="score-header">
      <span className="score-title">{label}</span>
      <span className={`score-value ${getScoreClass()}`}>{score}/100</span>
    </div>
  );
};

export default ScoreDisplay; 