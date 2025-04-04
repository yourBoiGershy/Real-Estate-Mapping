import React, { useState } from 'react';
import axios from 'axios';
import SearchForm from './components/SearchForm';
import SearchResults from './components/SearchResults';
import './App.css';

// Configure axios to use the backend URL
axios.defaults.baseURL = 'http://localhost:3001';

const App: React.FC = () => {
  const [address, setAddress] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchAddress: string) => {
    try {
      setAddress(searchAddress);
      setLoading(true);
      setError(null);
      
      // Call the backend API
      const response = await axios.get(`/api/analyze-address`, {
        params: { address: searchAddress }
      });
      
      console.log('API response:', response.data);
      
      setResults(response.data);
    } catch (err) {
      console.error('Error analyzing address:', err);
      
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Failed to analyze address');
      } else {
        setError('Failed to analyze address. Please try again.');
      }
      
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="app-container">
        <SearchForm 
          onSearch={handleSearch} 
          isLoading={loading} 
        />
        
        {(loading || results || error) && (
          <SearchResults
            address={address}
            results={results}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  );
};

export default App; 