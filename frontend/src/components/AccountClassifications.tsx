import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  message,
  Popconfirm,
  Typography,
  Tag,
  Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface Classification {
  id: number;
  name: string;
}

interface Account {
  id: number;
  name: string;
  category_name: string;
}

interface AccountClassificationsProps {
  selectedAccount: Account | null;
}

const AccountClassifications: React.FC<AccountClassificationsProps> = ({ selectedAccount }) => {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [allClassifications, setAllClassifications] = useState<Classification[]>([]);
  const [availableClassifications, setAvailableClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingClassification, setAddingClassification] = useState(false);
  const [selectedClassificationId, setSelectedClassificationId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedAccount) {
      fetchAccountClassifications();
      fetchAllClassifications();
    }
  }, [selectedAccount]);

  useEffect(() => {
    // Update available classifications when current classifications change
    if (allClassifications.length > 0) {
      const currentClassificationIds = classifications.map(c => c.id);
      const available = allClassifications.filter(c => !currentClassificationIds.includes(c.id));
      setAvailableClassifications(available);
    }
  }, [classifications, allClassifications]);

  const fetchAccountClassifications = async () => {
    if (!selectedAccount) return;
    
    try {
      setLoading(true);
      const data = await apiService.getAccountClassifications(selectedAccount.id);
      setClassifications(data);
    } catch (error) {
      message.error('Failed to fetch account classifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClassifications = async () => {
    try {
      const data = await apiService.getClassificationsDetailed();
      setAllClassifications(data);
    } catch (error) {
      message.error('Failed to fetch classifications');
      console.error(error);
    }
  };

  const handleAddClassification = async () => {
    if (!selectedAccount || !selectedClassificationId) return;

    try {
      setAddingClassification(true);
      await apiService.linkAccountClassification(selectedAccount.id, selectedClassificationId);
      message.success('Classification linked successfully');
      setSelectedClassificationId(null);
      fetchAccountClassifications();
    } catch (error) {
      message.error('Failed to link classification');
      console.error(error);
    } finally {
      setAddingClassification(false);
    }
  };

  const handleRemoveClassification = async (classificationId: number) => {
    if (!selectedAccount) return;

    try {
      await apiService.unlinkAccountClassification(selectedAccount.id, classificationId);
      message.success('Classification unlinked successfully');
      fetchAccountClassifications();
    } catch (error) {
      message.error('Failed to unlink classification');
      console.error(error);
    }
  };

  const columns: ColumnsType<Classification> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Classification',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={`Remove "${record.name}" classification from this account?`}
          onConfirm={() => handleRemoveClassification(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            size="small"
          >
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (!selectedAccount) {
    return (
      <Card title="Account Classifications" size="small">
        <Alert
          message="No Account Selected"
          description="Please select an account to view and manage its classifications."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div>
          <Title level={5} style={{ margin: 0 }}>Classifications</Title>
          <Text type="secondary">{selectedAccount.name}</Text>
        </div>
      } 
      size="small"
      extra={
        availableClassifications.length > 0 && (
          <Space>
            <Select
              style={{ width: 200 }}
              placeholder="Select classification"
              value={selectedClassificationId}
              onChange={setSelectedClassificationId}
              size="small"
            >
              {availableClassifications.map(classification => (
                <Option key={classification.id} value={classification.id}>
                  {classification.name}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={handleAddClassification}
              disabled={!selectedClassificationId}
              loading={addingClassification}
            >
              Add
            </Button>
          </Space>
        )
      }
    >
      {classifications.length === 0 ? (
        <Alert
          message="No Classifications"
          description="This account has no classifications assigned. Use the dropdown above to add one."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={classifications}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ y: 200 }}
        />
      )}

      {availableClassifications.length === 0 && allClassifications.length > 0 && (
        <Alert
          message="All Classifications Assigned"
          description="All available classifications have been assigned to this account."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default AccountClassifications;