import React, { useState } from 'react';

interface AddressFormProps {
  onSearch: (address: string) => void;
  isLoading: boolean;
}

const AddressForm: React.FC<AddressFormProps> = ({ onSearch, isLoading }) => {
  const [address, setAddress] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onSearch(address);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit}>
        <div className="search-input">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter an Ottawa address (e.g., 240 Sparks St, Ottawa)"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !address.trim()}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressForm; 