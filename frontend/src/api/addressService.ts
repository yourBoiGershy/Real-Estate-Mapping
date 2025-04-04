import axios from 'axios';
import { AddressAnalysisResponse } from '../types/address-analysis';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const analyzeAddress = async (address: string): Promise<AddressAnalysisResponse> => {
  try {
    const response = await axios.get<AddressAnalysisResponse>(`${API_URL}/analyze-address`, {
      params: { address }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Failed to analyze address');
    }
    throw new Error('An error occurred while analyzing the address');
  }
}; 