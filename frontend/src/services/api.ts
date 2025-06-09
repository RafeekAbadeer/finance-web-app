import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Transaction {
  id: number;
  description: string;
  currency_id: number;
  date: string;
  amount: number;
}

export interface Account {
  id: number;
  name: string;
  category: string;
  currency: string;
  nature: string;
  term: string;
}

export const apiService = {
  // Get all transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const response = await api.get('/api/transactions');
    return response.data.transactions;
  },

  // Get all accounts
  getAccounts: async (): Promise<Account[]> => {
    const response = await api.get('/api/accounts');
    return response.data.accounts;
  },

  // Test API connection
  testConnection: async (): Promise<string> => {
    const response = await api.get('/');
    return response.data.message;
  },
};