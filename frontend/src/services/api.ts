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

export interface Currency {
  id: number;
  name: string;
  exchange_rate: number;
}

export interface Classification {
  id: number;
  name: string;
}

export interface TransactionFormData {
  description: string;
  currency_id: number;
  lines: {
    account_id: number;
    debit?: number;
    credit?: number;
    date: string;
    classification_id?: number;
  }[];
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
    // Get all currencies
  getCurrencies: async (): Promise<Currency[]> => {
    const response = await api.get('/api/currencies');
    return response.data.currencies;
  },

  // Get all classifications
  getClassifications: async (): Promise<Classification[]> => {
    const response = await api.get('/api/classifications');
    return response.data.classifications;
  },

  // Create new transaction
  createTransaction: async (transactionData: TransactionFormData): Promise<any> => {
    const response = await api.post('/api/transactions', transactionData);
    return response.data;
  },

  // Update existing transaction
  updateTransaction: async (transactionId: number, transactionData: TransactionFormData): Promise<any> => {
    const response = await api.put(`/api/transactions/${transactionId}`, transactionData);
    return response.data;
  },

  // Delete transaction
  deleteTransaction: async (transactionId: number): Promise<any> => {
    const response = await api.delete(`/api/transactions/${transactionId}`);
    return response.data;
  },

};
