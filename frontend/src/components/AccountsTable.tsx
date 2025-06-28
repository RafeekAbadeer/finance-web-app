import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Card,
  Divider,
  Typography,
  Row,
  Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CreditCardOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface Account {
  id: number;
  name: string;
  category_name: string;
  currency_name: string;
  nature: 'debit' | 'credit' | 'both';
  term: 'short term' | 'medium term' | 'long term' | 'undefined';
  is_credit_card: boolean;
  credit_limit?: number;
  close_day?: number;
  due_day?: number;
  classifications?: string[];
}

interface Category {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  name: string;
  exchange_rate: number;
}

interface Classification {
  id: number;
  name: string;
}

interface AccountFormData {
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

const AccountsTable: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [form] = Form.useForm();

  const natureOptions = [
    { value: 'debit', label: 'Debit', color: 'red' },
    { value: 'credit', label: 'Credit', color: 'green' },
    { value: 'both', label: 'Both', color: 'blue' }
  ];

  const termOptions = [
    { value: 'undefined', label: 'Undefined' },
    { value: 'short term', label: 'Short Term' },
    { value: 'medium term', label: 'Medium Term' },
    { value: 'long term', label: 'Long Term' }
  ];

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchCurrencies();
    fetchClassifications();
  }, [currentPage, pageSize]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAccountsDetailed();
      setAccounts(data);
      setTotal(data.length); // For now, using length since backend doesn't return total
    } catch (error) {
      message.error('Failed to fetch accounts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const fetchCurrencies = async () => {
    try {
      const data = await apiService.getCurrenciesDetailed();
      setCurrencies(data);
    } catch (error) {
      message.error('Failed to fetch currencies');
    }
  };

  const fetchClassifications = async () => {
    try {
      const data = await apiService.getClassificationsDetailed();
      setClassifications(data);
    } catch (error) {
      message.error('Failed to fetch classifications');
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({
      nature: 'both',
      term: 'undefined',
      is_credit_card: false,
      close_day: 1,
      due_day: 15,
      credit_limit: 1000
    });
    setModalVisible(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    form.setFieldsValue({
      name: account.name,
      category_id: categories.find(c => c.name === account.category_name)?.id,
      currency_id: currencies.find(c => c.name === account.currency_name)?.id,
      nature: account.nature,
      term: account.term,
      is_credit_card: account.is_credit_card,
      credit_limit: account.credit_limit,
      close_day: account.close_day,
      due_day: account.due_day
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteAccount(id);
      message.success('Account deleted successfully');
      fetchAccounts();
      if (selectedAccount?.id === id) {
        setSelectedAccount(null);
      }
    } catch (error) {
      message.error('Failed to delete account');
      console.error(error);
    }
  };

  const handleSubmit = async (values: AccountFormData) => {
    try {
      if (editingAccount) {
        await apiService.updateAccount(editingAccount.id, values);
        message.success('Account updated successfully');
      } else {
        await apiService.createAccount(values);
        message.success('Account created successfully');
      }
      setModalVisible(false);
      fetchAccounts();
    } catch (error) {
      message.error(editingAccount ? 'Failed to update account' : 'Failed to create account');
      console.error(error);
    }
  };

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const columns: ColumnsType<Account> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      sorter: (a, b) => a.name.localeCompare(b.name),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search name"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
            >
              Search
            </Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small">
              Reset
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toString().toLowerCase()),
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 100,
      sorter: (a, b) => a.category_name.localeCompare(b.category_name),
      filters: Array.from(new Set(accounts.map(a => a.category_name))).map(category => ({
        text: category,
        value: category,
      })),
      onFilter: (value, record) => record.category_name === value,
    },
    {
      title: 'Currency',
      dataIndex: 'currency_name',
      key: 'currency_name',
      width: 80,
      sorter: (a, b) => a.currency_name.localeCompare(b.currency_name),
      filters: Array.from(new Set(accounts.map(a => a.currency_name))).map(currency => ({
        text: currency,
        value: currency,
      })),
      onFilter: (value, record) => record.currency_name === value,
    },
    {
      title: 'Nature',
      dataIndex: 'nature',
      key: 'nature',
      width: 80,
      render: (nature: string) => {
        const option = natureOptions.find(opt => opt.value === nature);
        return <Tag color={option?.color}>{option?.label}</Tag>;
      },
      filters: natureOptions.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.nature === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this account?"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Accounts</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Account
        </Button>
      </div>

      <Row gutter={24}>
        <Col span={selectedAccount ? 16 : 24}>
          {/* Accounts Table */}
          <Table
            columns={columns}
            dataSource={accounts}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} accounts`,
              pageSizeOptions: ['5', '10', '15', '20'],
            }}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => setSelectedAccount(record),
              style: { 
                cursor: 'pointer',
                backgroundColor: selectedAccount?.id === record.id ? '#e6f7ff' : undefined
              }
            })}
            scroll={{ x: 580, y: 400 }}
            size="small"
          />
        </Col>

        {selectedAccount && (
          <Col span={8}>
            <Card title="Account Details" size="small" style={{ height: 'fit-content' }}>
            <Row gutter={[16, 8]}>
                <Col span={12}>
                <div>
                    <Text strong>Name:</Text>
                    <br />
                    <Text>{selectedAccount.name}</Text>
                </div>
                </Col>
                <Col span={12}>
                <div>
                    <Text strong>Category:</Text>
                    <br />
                    <Text>{selectedAccount.category_name}</Text>
                </div>
                </Col>
                <Col span={12}>
                <div>
                    <Text strong>Currency:</Text>
                    <br />
                    <Text>{selectedAccount.currency_name}</Text>
                </div>
                </Col>
                <Col span={12}>
                <div>
                    <Text strong>Nature:</Text>
                    <br />
                    {(() => {
                    const option = natureOptions.find(opt => opt.value === selectedAccount.nature);
                    return <Tag color={option?.color}>{option?.label}</Tag>;
                    })()}
                </div>
                </Col>
                <Col span={12}>
                <div>
                    <Text strong>Term:</Text>
                    <br />
                    <Text>{selectedAccount.term.replace(/\b\w/g, l => l.toUpperCase())}</Text>
                </div>
                </Col>
                {/* Add empty Col to balance layout if odd number of fields */}
                <Col span={12}></Col>
                {selectedAccount.is_credit_card && (
                <>
                    <Col span={24}>
                    <Divider style={{ marginTop: 8, marginBottom: 2 }} />
                    <Title level={5} style={{ marginBottom: 8 }}>Credit Card Details</Title>
                    </Col>
                    <Col span={12}>
                    <div>
                        <Text strong>Credit Limit:</Text>
                        <br />
                        <Text>${selectedAccount.credit_limit?.toLocaleString()}</Text>
                    </div>
                    </Col>
                    <Col span={12}>
                    <div>
                        <Text strong>Statement Close Day:</Text>
                        <br />
                        <Text>{selectedAccount.close_day}</Text>
                    </div>
                    </Col>
                    <Col span={12}>
                    <div>
                        <Text strong>Payment Due Day:</Text>
                        <br />
                        <Text>{selectedAccount.due_day}</Text>
                    </div>
                    </Col>
                </>
                )}
            </Row>
            </Card>
          </Col>
        )}
      </Row>

      <Modal
        title={editingAccount ? 'Edit Account' : 'Create Account'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="Account Name"
            name="name"
            rules={[{ required: true, message: 'Please enter account name' }]}
          >
            <Input placeholder="Enter account name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="category_id"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select 
                  placeholder="Select category" 
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children?.toString() || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {categories.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Currency"
                name="currency_id"
                rules={[{ required: true, message: 'Please select a currency' }]}
              >
                <Select 
                  placeholder="Select currency" 
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children?.toString() || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {currencies.map(currency => (
                    <Option key={currency.id} value={currency.id}>
                      {currency.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Nature"
                name="nature"
                rules={[{ required: true, message: 'Please select account nature' }]}
              >
                <Select placeholder="Select nature">
                  {natureOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Term"
                name="term"
                rules={[{ required: true, message: 'Please select account term' }]}
              >
                <Select placeholder="Select term">
                  {termOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Credit Card" name="is_credit_card" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item shouldUpdate={(prevValues, currentValues) => 
            prevValues.is_credit_card !== currentValues.is_credit_card
          }>
            {({ getFieldValue }) => {
              const isCreditCard = getFieldValue('is_credit_card');
              
              if (!isCreditCard) return null;

              return (
                <>
                  <Card title="Credit Card Details" size="small" style={{ marginTop: 16 }}>
                    <Form.Item
                      label="Credit Limit"
                      name="credit_limit"
                      rules={[
                        { required: true, message: 'Please enter credit limit' },
                        { type: 'number', min: 0, message: 'Credit limit must be positive' }
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="Enter credit limit"
                        formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="Statement Close Day"
                          name="close_day"
                          rules={[
                            { required: true, message: 'Please enter close day' },
                            { type: 'number', min: 1, max: 31, message: 'Day must be between 1-31' }
                          ]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Day of month"
                            min={1}
                            max={31}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="Payment Due Day"
                          name="due_day"
                          rules={[
                            { required: true, message: 'Please enter due day' },
                            { type: 'number', min: 1, max: 31, message: 'Day must be between 1-31' }
                          ]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Day of month"
                            min={1}
                            max={31}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountsTable;