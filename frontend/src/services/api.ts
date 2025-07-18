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

export interface Account {
  id: number;
  name: string;
  category: string;           // For TransactionTable grouping
  category_name: string;      // For AccountsTable display  
  currency: string;           // For TransactionTable
  currency_name: string;      // For AccountsTable display
  nature: 'debit' | 'credit' | 'both';
  term: 'short term' | 'medium term' | 'long term' | 'undefined';
  is_credit_card: boolean;
  credit_limit?: number;
  close_day?: number;
  due_day?: number;
  classifications?: string[];
}

export interface AccountFormData {
  name: string;
  category_id: number;
  currency_id: number;
  nature: 'debit' | 'credit' | 'both';
  term: 'short term' | 'medium term' | 'long term' | 'undefined';
  is_credit_card: boolean;
  credit_limit?: number;
  close_day?: number;
  due_day?: number;
}

export interface Category {
  id: number;
  name: string;
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

// Dashboard interfaces
export interface AccountBalance {
  id: number;
  name: string;
  category: string;
  balance: number;
  currency: string;
  nature: string;
  term: string;
  is_credit_card: boolean;
  credit_limit?: number;
  due_day?: number;
  close_day?: number;
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  accountCount: number;
}

export interface CreditCardDue {
  id: number;
  account_name: string;
  current_balance: number;
  credit_limit: number;
  due_date: string;
  days_until_due: number;
  utilization_percentage: number;
}

export interface DashboardData {
  summary: FinancialSummary;
  accountBalances: AccountBalance[];
  recentTransactions: Transaction[];
  creditCardDues: CreditCardDue[];
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

  // Account CRUD methods
  getAccountsDetailed: async (): Promise<Account[]> => {
    const response = await api.get('/api/accounts/detailed');
    return response.data.accounts;
  },

  createAccount: async (accountData: AccountFormData): Promise<Account> => {
    const response = await api.post('/api/accounts', accountData);
    return response.data.account;
  },

  updateAccount: async (accountId: number, accountData: AccountFormData): Promise<Account> => {
    const response = await api.put(`/api/accounts/${accountId}`, accountData);
    return response.data.account;
  },

  deleteAccount: async (accountId: number): Promise<void> => {
    await api.delete(`/api/accounts/${accountId}`);
  },

  // Category CRUD methods
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/api/categories');
    return response.data.categories;
  },

  createCategory: async (categoryData: { name: string }): Promise<Category> => {
    const response = await api.post('/api/categories', categoryData);
    return response.data.category;
  },

  updateCategory: async (categoryId: number, categoryData: { name: string }): Promise<Category> => {
    const response = await api.put(`/api/categories/${categoryId}`, categoryData);
    return response.data.category;
  },

  deleteCategory: async (categoryId: number): Promise<void> => {
    try {
      console.log('apiService: About to call DELETE', categoryId);
      const response = await api.delete(`/api/categories/${categoryId}`);
      console.log('apiService: Delete successful', response);
    } catch (err) {
      const error = err as any;
      console.log('apiService: Error caught:', error);
      console.log('apiService: Error response:', error.response);
      console.log('apiService: Error status:', error.response?.status);
      console.log('apiService: Error data:', error.response?.data);
      throw error; // Re-throw to let the component handle it
    }
  },

  // Account-Classification linking
  getAccountClassifications: async (accountId: number): Promise<Classification[]> => {
    const response = await api.get(`/api/accounts/${accountId}/classifications`);
    return response.data.classifications;
  },

  linkAccountClassification: async (accountId: number, classificationId: number): Promise<void> => {
    await api.post(`/api/accounts/${accountId}/classifications/${classificationId}`);
  },

  unlinkAccountClassification: async (accountId: number, classificationId: number): Promise<void> => {
    await api.delete(`/api/accounts/${accountId}/classifications/${classificationId}`);
  },

  // Currency CRUD methods
  getCurrenciesDetailed: async (): Promise<Currency[]> => {
    const response = await api.get('/api/currencies/detailed');
    return response.data.currencies;
  },

  createCurrency: async (currencyData: { name: string; exchange_rate: number }): Promise<Currency> => {
    const response = await api.post('/api/currencies', currencyData);
    return response.data.currency;
  },

  updateCurrency: async (currencyId: number, currencyData: { name: string; exchange_rate: number }): Promise<Currency> => {
    const response = await api.put(`/api/currencies/${currencyId}`, currencyData);
    return response.data.currency;
  },

  deleteCurrency: async (currencyId: number): Promise<void> => {
    await api.delete(`/api/currencies/${currencyId}`);
  },

  // Classification CRUD methods
  getClassificationsDetailed: async (): Promise<Classification[]> => {
    const response = await api.get('/api/classifications/detailed');
    return response.data.classifications;
  },

  createClassification: async (classificationData: { name: string }): Promise<Classification> => {
    const response = await api.post('/api/classifications', classificationData);
    return response.data.classification;
  },

  updateClassification: async (classificationId: number, classificationData: { name: string }): Promise<Classification> => {
    const response = await api.put(`/api/classifications/${classificationId}`, classificationData);
    return response.data.classification;
  },

  deleteClassification: async (classificationId: number): Promise<void> => {
    await api.delete(`/api/classifications/${classificationId}`);
  },

  // Dashboard API functions
  getDashboardData: async (): Promise<DashboardData> => {
    const response = await api.get('/api/dashboard');
    return response.data;
  },

  getAccountBalances: async (): Promise<AccountBalance[]> => {
    const response = await api.get('/api/account-balances');
    return response.data.balances;
  },

  getCreditCardDues: async (): Promise<CreditCardDue[]> => {
    const response = await api.get('/api/credit-card-dues');
    return response.data.dues;
  },

};
