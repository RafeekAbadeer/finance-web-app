import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Popconfirm, message, Modal, Form, Input, InputNumber, Typography
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../services/api';

const { Title } = Typography;

interface Currency {
  id: number;
  name: string;
  exchange_rate: number;
}

interface CurrencyFormData {
  name: string;
  exchange_rate: number;
}

const CurrenciesTable: React.FC = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [tableScrollY, setTableScrollY] = useState(450);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCurrencies();
  }, [currentPage, pageSize]);

  useEffect(() => {
    function updateTableHeight() {
      const parent = document.getElementById('currencies-table-parent');
      if (parent) {
        const header = parent.querySelector('.currencies-header');
        const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
        const extra = 180;
        setTableScrollY(parent.clientHeight - extra);
      }
    }
    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);
    return () => window.removeEventListener('resize', updateTableHeight);
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCurrenciesDetailed();
      setCurrencies(data);
      setTotal(data.length);
    } catch (error) {
      message.error('Failed to fetch currencies');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCurrency(null);
    form.resetFields();
    form.setFieldsValue({ exchange_rate: 1.0 }); // Default exchange rate
    setModalVisible(true);
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    form.setFieldsValue({ 
      name: currency.name,
      exchange_rate: currency.exchange_rate 
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteCurrency(id);
      message.success('Currency deleted successfully');
      fetchCurrencies();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to delete currency';
      message.error(errorMsg);
    }
  };

  const handleSubmit = async (values: CurrencyFormData) => {
    try {
      if (editingCurrency) {
        await apiService.updateCurrency(editingCurrency.id, values);
        message.success('Currency updated successfully');
      } else {
        await apiService.createCurrency(values);
        message.success('Currency created successfully');
      }
      setModalVisible(false);
      fetchCurrencies();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to save currency';
      message.error(errorMsg);
    }
  };

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const columns: ColumnsType<Currency> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: '20%',
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
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
      title: 'Exchange Rate',
      dataIndex: 'exchange_rate',
      key: 'exchange_rate',
      width: '20',
      align: 'right',
      sorter: (a, b) => a.exchange_rate - b.exchange_rate,
      render: (rate: number) => rate.toFixed(4),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
          >
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this currency?"
            description="This will affect accounts and transactions using this currency."
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div 
      id="currencies-table-parent"
      style={{ 
        padding: '24px 24px 0px 24px', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div 
        className="currencies-header"
        style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <Title level={2} style={{ margin: 0 }}>Currencies</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Currency
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={currencies}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} currencies`,
          pageSizeOptions: ['5', '10', '15', '20'],
        }}
        onChange={handleTableChange}
        scroll={{ y: tableScrollY }}
      />

      <Modal
        title={editingCurrency ? 'Edit Currency' : 'Create Currency'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width={500}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="Currency Name"
            rules={[{ required: true, message: 'Please enter currency name' }]}
          >
            <Input placeholder="e.g., USD, EUR, EGP" />
          </Form.Item>
          <Form.Item
            name="exchange_rate"
            label="Exchange Rate"
            rules={[
              { required: true, message: 'Please enter exchange rate' },
              { type: 'number', min: 0.0001, message: 'Exchange rate must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="1.0000"
              step={0.0001}
              precision={4}
              min={0.0001}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CurrenciesTable;