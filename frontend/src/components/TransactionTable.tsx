import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Space, Tag, message } from 'antd';
import { apiService, Transaction } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const TransactionTable: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Load transactions when component mounts
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTransactions();
      setTransactions(data);
      message.success(`Loaded ${data.length} transactions`);
    } catch (error) {
      message.error('Failed to load transactions');
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Define table columns
  const columns: ColumnsType<Transaction> = [
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    width: 100,
    sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    render: (date: string) => {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2);
      return `${day}.${month}.${year}`;
    },
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
    sorter: (a, b) => a.description.localeCompare(b.description), // Add sorting
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right',
    sorter: (a, b) => a.amount - b.amount,
    render: (amount: number) => (
      <Tag color={amount >= 0 ? 'green' : 'red'}>
        {Math.abs(amount).toFixed(2)} {/* Remove $ sign */}
      </Tag>
    ),
  },
  {
    title: 'Currency',
    dataIndex: 'currency_name',  // Changed from currency_code
    key: 'currency_name',
    width: 80,
  },
  {
    title: 'Accounts',
    dataIndex: 'accounts',
    key: 'accounts',
    ellipsis: true,
  },
];

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={2}>Transactions</Title>
        
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} transactions`,
          }}
          scroll={{ x: true }}
        />
      </Space>
    </Card>
  );
};

export default TransactionTable;