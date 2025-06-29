import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, message, Button, Modal, Form, Input, Select, InputNumber, 
  DatePicker, Space, Popconfirm } from 'antd';
import { apiService, Transaction, TransactionLine, Account, Currency, Classification, 
  TransactionFormData } from '../services/api';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;

const TransactionMasterDetail: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionLines, setTransactionLines] = useState<TransactionLine[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [linesGenerated, setLinesGenerated] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  useEffect(() => {
    loadTransactions(1, 15);
    loadSupportingData();
  }, []);

  const loadTransactions = async (page: number = 1, pageSize: number = 15) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await fetch(`http://localhost:8000/api/transactions?skip=${skip}&limit=${pageSize}`);
      const data = await response.json();
      
      setTransactions(data.transactions);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: data.total,
      });
      
      message.success(`Loaded ${data.transactions.length} transactions`);
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
    
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: Transaction) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            title="Edit Transaction"
          />
          <Popconfirm
            title="Delete Transaction"
            description="Are you sure you want to delete this transaction? This action cannot be undone."
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            okText="Yes, Delete"
            cancelText="Cancel"
            okType="danger"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
              title="Delete Transaction"
            />
          </Popconfirm>
        </Space>
      ),
    }  
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

  const loadSupportingData = async () => {
    try {
      const [currenciesData, classificationsData, accountsData] = await Promise.all([
        apiService.getCurrencies(),
        apiService.getClassifications(),
        apiService.getAccounts()
      ]);
      setCurrencies(currenciesData);
      setClassifications(classificationsData);
      setAccounts(accountsData);
    } catch (error) {
      message.error('Failed to load supporting data');
      console.error('Error loading supporting data:', error);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setFormValues({});
    setLinesGenerated(false);
    setEditingTransaction(null); // Clear editing state
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Validate transaction lines
      if (!values.lines || values.lines.length < 2) {
        message.error('Transaction must have at least 2 lines');
        return;
      }
      
      // Calculate totals and validate balance
      const balance = calculateBalance(values.lines);
      
      if (!balance.isBalanced) {
        message.error(`Transaction is not balanced! Debit: ${balance.totalDebit.toFixed(2)}, Credit: ${balance.totalCredit.toFixed(2)}`);
        return;
      }
      
      if (balance.totalDebit === 0) {
        message.error('Transaction amount cannot be zero');
        return;
      }
      
      // Validate each line has either debit or credit (not both, not neither)
      for (let i = 0; i < values.lines.length; i++) {
        const line = values.lines[i];
        const hasDebit = line.debit && line.debit > 0;
        const hasCredit = line.credit && line.credit > 0;
        
        if (!hasDebit && !hasCredit) {
          message.error(`Line ${i + 1}: Must have either a debit or credit amount`);
          return;
        }
        
        if (!line.account_id) {
          message.error(`Line ${i + 1}: Must select an account`);
          return;
        }
      }
      
      const transactionData: TransactionFormData = {
        description: values.description,
        currency_id: values.currency_id,
        lines: values.lines.map((line: any) => ({
          account_id: line.account_id,
          debit: line.debit || null,
          credit: line.credit || null,
          date: line.date.format('YYYY-MM-DD'),
          classification_id: line.classification_id || null
        }))
      };

      // Call appropriate API based on mode
      if (editingTransaction) {
        await apiService.updateTransaction(editingTransaction.id, transactionData);
        message.success('Transaction updated successfully');
        
        // If the edited transaction is currently selected, refresh its lines
        if (selectedTransaction && selectedTransaction.id === editingTransaction.id) {
          await loadTransactionLines(editingTransaction.id);
        }
      } else {
        await apiService.createTransaction(transactionData);
        message.success('Transaction created successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      setFormValues({});
      setLinesGenerated(false);
      setEditingTransaction(null);
      loadTransactions();
    } catch (error) {
      const action = editingTransaction ? 'update' : 'save';
      message.error(`Failed to ${action} transaction`);
      console.error(`Error ${action}ing transaction:`, error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFormValues({});
    setLinesGenerated(false);
    setEditingTransaction(null); // Clear editing state
  };

  const handleEdit = async (transaction: Transaction) => {
    try {
      // Load transaction lines
      const linesData = await apiService.getTransactionLines(transaction.id);
      
      // Find currency ID by name
      const currencyId = currencies.find(c => c.name === transaction.currency_name)?.id;
      
      // Calculate default amount (total debit or credit)
      const totalDebit = linesData.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = linesData.reduce((sum, line) => sum + (line.credit || 0), 0);
      const defaultAmount = Math.max(totalDebit, totalCredit);
      
      // Find earliest date
      const dates = linesData.map(line => new Date(line.date));
      const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
      
      // Prepare lines data
      const formLines = linesData.map((line: TransactionLine) => {
        // Find classification ID by name
        const classificationId = line.classification_name ? 
          classifications.find(c => c.name === line.classification_name)?.id : undefined;
        
        return {
          account_id: accounts.find(a => a.name === line.account_name)?.id,
          debit: line.debit,
          credit: line.credit,
          date: dayjs(line.date),
          classification_id: classificationId
        };
      });
      
      // Set form values for editing
      form.setFieldsValue({
        description: transaction.description,
        currency_id: currencyId,
        default_amount: defaultAmount,
        default_date: dayjs(earliestDate),
        lines: formLines
      });
      
      setEditingTransaction(transaction);
      setLinesGenerated(true); // Show lines section immediately
      setIsModalVisible(true);
      
      // Update form values state
      setTimeout(() => {
        setFormValues(form.getFieldsValue());
      }, 100);
      
    } catch (error) {
      message.error('Failed to load transaction details');
      console.error('Error loading transaction:', error);
    }
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await apiService.deleteTransaction(transactionId);
      message.success('Transaction deleted successfully');
      
      // If the deleted transaction was currently selected, clear the selection
      if (selectedTransaction && selectedTransaction.id === transactionId) {
        setSelectedTransaction(null);
        setTransactionLines([]);
      }
      
      // Reload the transactions list
      loadTransactions();
    } catch (error) {
      message.error('Failed to delete transaction');
      console.error('Error deleting transaction:', error);
    }
  };

  const [formValues, setFormValues] = useState<any>({});

  // Helper function to calculate balance
  const calculateBalance = (lines: any[] = []) => {
    const totalDebit = lines.reduce((sum, line) => sum + (line?.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line?.credit || 0), 0);
    return { totalDebit, totalCredit, isBalanced: totalDebit === totalCredit && totalDebit > 0 };
  };

  //Handle form value changes (but don't auto-generate lines)
  const handleFormChange = (changedValues: any, allValues: any) => {
    // Only update formValues, don't auto-generate anything
    setFormValues(allValues);
  };

  // Custom validation for debit/credit mutual exclusion
  const validateDebitCredit = (_: any, value: any, callback: any) => {
    const fieldName = _.field;
    const lineIndex = fieldName.split('.')[1]; // Extract line index
    const isDebit = fieldName.includes('debit');
    
    const currentLines = form.getFieldValue('lines') || [];
    const currentLine = currentLines[lineIndex];
    
    if (value && value > 0) {
      // If entering debit, clear credit and vice versa
      if (isDebit && currentLine?.credit) {
        form.setFieldValue(['lines', lineIndex, 'credit'], undefined);
      } else if (!isDebit && currentLine?.debit) {
        form.setFieldValue(['lines', lineIndex, 'debit'], undefined);
      }
    }
    
    callback();
  };

  // Get classifications available for a specific account
  const getClassificationsForAccount = (accountId: number) => {
    if (!accountId) return classifications;
    
    // For now, return all classifications
    // Later you can implement account-specific filtering based on your database logic
    return classifications;
  };

  return (
    <div style={{ 
      height: 'calc(100vh - 120px)', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px' 
    }}>
      {/* Top - Transactions Table */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Transactions</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="small"
            >
              Add Transaction
            </Button>
          </div>
        }
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
          padding: '12px',
          paddingBottom: '24px' // More bottom padding for pagination
        }}
      >
        <Table
          columns={transactionColumns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            ...pagination,
            size: 'small',
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '20', '25', '50'],
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total}`,
            style: { 
              margin: '12px 0 0 0',
              textAlign: 'center'
            },
            onChange: (page, pageSize) => {
              loadTransactions(page, pageSize || 15);
            },
            onShowSizeChange: (current, size) => {
              loadTransactions(1, size); // Reset to first page when changing page size
            }
          }}
          scroll={{ 
            y: selectedTransaction ? 'calc(55vh - 240px)' : 'calc(100vh - 300px)', // More space for pagination
            x: true
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
      {/* Smart Transaction Form Modal */}
      <Modal
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={1000}
        okText="Save Transaction"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
          {/* Stage 1: Transaction Setup */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Transaction Details</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: 'Please enter description' }]}
                style={{ flex: 2 }}
              >
                <Input placeholder="Transaction description" />
              </Form.Item>

              <Form.Item
                name="default_date"
                label="Date"
                rules={[{ required: true, message: 'Please select date' }]}
                style={{ flex: 1 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="default_amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
                style={{ flex: 1 }}
              >
                <InputNumber placeholder="0.00" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="currency_id"
                label="Currency"
                rules={[{ required: true, message: 'Please select currency' }]}
                style={{ flex: 1 }}
              >
                <Select placeholder="Select currency">
                  {currencies.map(currency => (
                    <Select.Option key={currency.id} value={currency.id}>
                      {currency.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>


            {/* Generate Lines Button */}
            <Button 
              type="primary" 
              onClick={() => {
                const currentValues = form.getFieldsValue();
                const amount = Number(currentValues.default_amount);
                const date = currentValues.default_date;
                const description = currentValues.description;
                const currency = currentValues.currency_id;
                
                if (amount && date && description && currency) {
                  const newLines = [
                    { debit: amount, date: date },
                    { credit: amount, date: date }
                  ];
                  
                  form.setFieldsValue({ lines: newLines });
                  setLinesGenerated(true);
                  
                  setTimeout(() => {
                    setFormValues(form.getFieldsValue());
                  }, 50);
                } else {
                  message.warning('Please fill all required fields first (Description, Date, Amount, Currency)');
                }
              }}
              style={{ marginTop: 8 }}
              disabled={editingTransaction !== null} // Disable in edit mode
            >
              {editingTransaction ? 'Lines Already Loaded' : 'Generate Transaction Lines'}
            </Button>
          </div>

          {/* Stage 2: Transaction Lines (only show if lines exist) */}
          {linesGenerated && form.getFieldValue('lines')?.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px 0' }}>Transaction Lines (Debit = Credit)</h4>
              
              {/* Balance Indicator */}
              <div style={{ 
                background: calculateBalance(formValues.lines).isBalanced ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${calculateBalance(formValues.lines).isBalanced ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: 6,
                padding: 12,
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>Balance Check:</strong>
                  <span style={{ marginLeft: 16 }}>
                    Debit: {calculateBalance(formValues.lines).totalDebit.toFixed(2)}
                  </span>
                  <span style={{ marginLeft: 16 }}>
                    Credit: {calculateBalance(formValues.lines).totalCredit.toFixed(2)}
                  </span>
                </div>
                <div style={{ 
                  color: calculateBalance(formValues.lines).isBalanced ? '#52c41a' : '#ff4d4f',
                  fontWeight: 'bold'
                }}>
                  {calculateBalance(formValues.lines).isBalanced ? '✓ Balanced' : '✗ Not Balanced'}
                </div>
              </div>

              <Form.List name="lines">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'account_id']}
                          label="Account"
                          rules={[{ required: true, message: 'Account required' }]}
                          style={{ flex: 2 }}
                        >
                          <Select 
                            placeholder="Select account"
                            onChange={() => {
                              // Clear classification when account changes
                              form.setFieldValue(['lines', name, 'classification_id'], undefined);
                            }}
                          >
                            {accounts.map(account => (
                              <Select.Option key={account.id} value={account.id}>
                                {account.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'debit']}
                          label={<span style={{ color: '#cf1322', fontWeight: 'bold' }}>Debit</span>}
                          style={{ flex: 1 }}
                        >
                          <InputNumber 
                            placeholder="0.00" 
                            style={{ 
                              width: '100%',
                              borderColor: '#ffccc7',
                              backgroundColor: '#fff2f0'
                            }}
                            onChange={(value) => {
                              if (value && Number(value) > 0) {
                                form.setFieldValue(['lines', name, 'credit'], undefined);
                              }
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'credit']}
                          label={<span style={{ color: '#389e0d', fontWeight: 'bold' }}>Credit</span>}
                          style={{ flex: 1 }}
                        >
                          <InputNumber 
                            placeholder="0.00" 
                            style={{ 
                              width: '100%',
                              borderColor: '#b7eb8f',
                              backgroundColor: '#f6ffed'
                            }}
                            onChange={(value) => {
                              if (value && Number(value) > 0) {
                                form.setFieldValue(['lines', name, 'debit'], undefined);
                              }
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'date']}
                          label="Date"
                          style={{ flex: 1 }}
                        >
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'classification_id']}
                          label="Classification"
                          style={{ flex: 1 }}
                        >
                          <Select 
                            placeholder="Optional" 
                            allowClear
                            disabled={!form.getFieldValue(['lines', name, 'account_id'])}
                            onFocus={() => {
                              // Clear classification if account changed
                              const selectedAccountId = form.getFieldValue(['lines', name, 'account_id']);
                              if (!selectedAccountId) {
                                form.setFieldValue(['lines', name, 'classification_id'], undefined);
                              }
                            }}
                          >
                            {classifications.map(classification => (
                              <Select.Option key={classification.id} value={classification.id}>
                                {classification.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        {fields.length > 2 && (
                          <Button type="text" onClick={() => remove(name)} style={{ marginBottom: 24 }}>
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Add Transaction Line
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default TransactionMasterDetail;