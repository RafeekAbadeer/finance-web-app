import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Popconfirm, message, Modal, Form, Input, Typography
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../services/api';

const { Title } = Typography;

interface Classification {
  id: number;
  name: string;
}

const ClassificationsTable: React.FC = () => {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClassification, setEditingClassification] = useState<Classification | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [tableScrollY, setTableScrollY] = useState(450);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchClassifications();
  }, [currentPage, pageSize]);

  useEffect(() => {
    function updateTableHeight() {
      const parent = document.getElementById('classifications-table-parent');
      if (parent) {
        const header = parent.querySelector('.classifications-header');
        const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
        const extra = 180;
        setTableScrollY(parent.clientHeight - extra);
      }
    }
    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);
    return () => window.removeEventListener('resize', updateTableHeight);
  }, []);

  const fetchClassifications = async () => {
    try {
      setLoading(true);
      const data = await apiService.getClassificationsDetailed();
      setClassifications(data);
      setTotal(data.length);
    } catch (error) {
      message.error('Failed to fetch classifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClassification(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (classification: Classification) => {
    setEditingClassification(classification);
    form.setFieldsValue({ name: classification.name });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteClassification(id);
      message.success('Classification deleted successfully');
      fetchClassifications();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to delete classification';
      message.error(errorMsg);
    }
  };

  const handleSubmit = async (values: { name: string }) => {
    try {
      if (editingClassification) {
        await apiService.updateClassification(editingClassification.id, values);
        message.success('Classification updated successfully');
      } else {
        await apiService.createClassification(values);
        message.success('Classification created successfully');
      }
      setModalVisible(false);
      fetchClassifications();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to save classification';
      message.error(errorMsg);
    }
  };

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const columns: ColumnsType<Classification> = [
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
      width: '60%',
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
      title: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            title="Edit Classification"
          />
          <Popconfirm
            title="Are you sure you want to delete this classification?"
            description="This will affect transaction lines and account links using this classification."
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
              title="Delete Classification"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div 
      id="classifications-table-parent"
      style={{ 
        padding: '24px 24px 0px 24px', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div 
        className="classifications-header"
        style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <Title level={2} style={{ margin: 0 }}>Classifications</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Classification
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={classifications}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} classifications`,
          pageSizeOptions: ['5', '10', '15', '20'],
        }}
        onChange={handleTableChange}
        scroll={{ y: tableScrollY }}
      />

      <Modal
        title={editingClassification ? 'Edit Classification' : 'Create Classification'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width={400}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="Classification Name"
            rules={[{ required: true, message: 'Please enter classification name' }]}
          >
            <Input placeholder="Enter classification name" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassificationsTable;