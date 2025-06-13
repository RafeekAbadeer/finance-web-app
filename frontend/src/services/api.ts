import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface TransactionLine {
  id: number;
  transaction_id: number;
  account_name: string;
  debit: number | null;
  credit: number | null;
  date: string;
  classification_name: string | null;
}

export interface Transaction {
  id: number;
  description: string;
  currency_name: string;
  date: string;
  amount: number;
  accounts: string;
  total_debit: number;
  total_credit: number;
  line_count: number;
}

export interface TransactionLine {
  id: number;
  transaction_id: number;
  account_name: string;
  debit: number | null;
  credit: number | null;
  date: string;
  classification_name: string | null;
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

  // Get transaction lines for a specific transaction
  getTransactionLines: async (transactionId: number): Promise<TransactionLine[]> => {
    const response = await api.get(`/api/transactions/${transactionId}/lines`);
    return response.data.lines;
  },

  // Test API connection
  testConnection: async (): Promise<string> => {
    const response = await api.get('/');
    return response.data.message;
  },
};
