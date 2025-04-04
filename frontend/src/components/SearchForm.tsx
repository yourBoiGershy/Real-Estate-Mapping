import React, { useState } from 'react';
import './SearchForm.css';

interface SearchFormProps {
  onSearch: (address: string) => void;
  isLoading: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }
    
    setError('');
    onSearch(address);
  };

  return (
    <div className="search-form-container">
      <h1>Ottawa Real Estate Analysis</h1>
      <p className="subtitle">Enter an Ottawa address to analyze its location score based on mobility, livability, and emergency services access.</p>
      
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter an Ottawa address (e.g., 240 Sparks St, Ottawa)"
            disabled={isLoading}
            className={error ? 'error' : ''}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </form>
      
      <div className="example-addresses">
        <p>Try these example addresses:</p>
        <ul>
          <li><button 
            type="button" 
            onClick={() => {
              setAddress('240 Sparks St, Ottawa');
              onSearch('240 Sparks St, Ottawa');
            }}
            disabled={isLoading}
          >
            240 Sparks St (Downtown)
          </button></li>
          <li><button 
            type="button" 
            onClick={() => {
              setAddress('1053 Carling Ave, Ottawa');
              onSearch('1053 Carling Ave, Ottawa');
            }}
            disabled={isLoading}
          >
            1053 Carling Ave (Civic Hospital)
          </button></li>
          <li><button 
            type="button" 
            onClick={() => {
              setAddress('200 ByWard Market Square, Ottawa');
              onSearch('200 ByWard Market Square, Ottawa');
            }}
            disabled={isLoading}
          >
            200 ByWard Market Square
          </button></li>
        </ul>
      </div>
    </div>
  );
};

export default SearchForm; 