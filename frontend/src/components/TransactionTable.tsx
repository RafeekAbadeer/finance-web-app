import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, message } from 'antd';
import { apiService, Transaction, TransactionLine } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const TransactionMasterDetail: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionLines, setTransactionLines] = useState<TransactionLine[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);

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

  const loadTransactionLines = async (transactionId: number) => {
    setLinesLoading(true);
    try {
      const data = await apiService.getTransactionLines(transactionId);
      setTransactionLines(data);
    } catch (error) {
      message.error('Failed to load transaction lines');
      console.error('Error loading transaction lines:', error);
    } finally {
      setLinesLoading(false);
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    loadTransactionLines(transaction.id);
  };

  // Optimized transaction table columns with full names
  const transactionColumns: ColumnsType<Transaction> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 90, // Fits "dd.mm.yy" format perfectly
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
      sorter: (a, b) => a.description.localeCompare(b.description),
      // This will be the flexible column - takes remaining space
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 110, // Fits "Amount" header + reasonable amounts
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => (
        <Tag color={amount >= 0 ? 'green' : 'red'} style={{ margin: 0 }}>
          {Math.abs(amount).toFixed(2)}
        </Tag>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency_name',
      key: 'currency_name',
      width: 90, // Fits "Currency" header + "EGP", "USD", etc.
    },
    {
      title: 'Lines',
      dataIndex: 'line_count',
      key: 'line_count',
      width: 70, // Fits "Lines" header + reasonable line counts
      align: 'center',
    },
  ];

  // Optimized transaction lines table columns with full names
  const linesColumns: ColumnsType<TransactionLine> = [
    {
      title: 'Account',
      dataIndex: 'account_name',
      key: 'account_name',
      ellipsis: true,
      // This will be the flexible column - takes remaining space
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: 100, // Fits "Debit" header + reasonable amounts
      align: 'right',
      render: (debit: number | null) => 
        debit ? <Tag color="red" style={{ margin: 0 }}>{debit.toFixed(2)}</Tag> : null,
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: 100, // Fits "Credit" header + reasonable amounts
      align: 'right',
      render: (credit: number | null) => 
        credit ? <Tag color="green" style={{ margin: 0 }}>{credit.toFixed(2)}</Tag> : null,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 90, // Same as transactions table
      render: (date: string) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear().toString().slice(-2);
        return `${day}.${month}.${year}`;
      },
    },
    {
      title: 'Classification',
      dataIndex: 'classification_name',
      key: 'classification_name',
      width: 130, // Fits "Classification" header + reasonable classification names
      ellipsis: true,
      render: (classification: string | null) => classification || '',
    },
  ];

  const topTableHeight = selectedTransaction ? '55%' : '100%';
  const bottomTableHeight = '40%';

  return (
    <div style={{ 
      height: 'calc(100vh - 120px)', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px' 
    }}>
      {/* Top - Transactions Table */}
      <Card 
        title={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>Transactions</span>}
        size="small"
        style={{ 
          height: topTableHeight,
          display: 'flex', 
          flexDirection: 'column',
          transition: 'height 0.3s ease'
        }}
        bodyStyle={{ 
          flex: 1, 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '12px', // Increased for better spacing
          paddingBottom: '16px' // Extra bottom padding for pagination
        }}
      >
        <Table
          columns={transactionColumns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            size: 'small',
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '20', '25', '50'],
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total}`,
            style: { 
              margin: '12px 0 0 0', // More space above pagination
              textAlign: 'center'
            }
          }}
          scroll={{ 
            y: selectedTransaction ? 'calc(55vh - 200px)' : 'calc(100vh - 260px)', // More space for pagination
            x: true // Enable horizontal scroll if needed
          }}
          onRow={(record) => ({
            onClick: () => handleTransactionClick(record),
            style: { 
              cursor: 'pointer',
              backgroundColor: selectedTransaction?.id === record.id ? '#e6f7ff' : undefined
            },
          })}
        />
      </Card>

      {/* Bottom - Transaction Lines */}
      {selectedTransaction && (
        <Card 
          title={
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              Lines: {selectedTransaction.description}
            </span>
          }
          size="small"
          style={{ 
            height: bottomTableHeight,
            display: 'flex', 
            flexDirection: 'column'
          }}
          bodyStyle={{ 
            flex: 1, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '12px'
          }}
        >
          <Table
            columns={linesColumns}
            dataSource={transactionLines}
            rowKey="id"
            loading={linesLoading}
            pagination={false}
            size="small"
            scroll={{ 
              y: 'calc(40vh - 120px)',
              x: true
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default TransactionMasterDetail;