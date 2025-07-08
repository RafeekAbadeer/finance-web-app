import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Popconfirm, message, Modal, Form, Input, Typography
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../services/api';

const { Title } = Typography;

interface Category {
    id: number;
    name: string;
}

const CategoriesTable: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [tableScrollY, setTableScrollY] = useState(450);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchCategories();
    }, [currentPage, pageSize]);

    useEffect(() => {
        function updateTableHeight() {
        const parent = document.getElementById('categories-table-parent');
        if (parent) {
            const header = parent.querySelector('.categories-header');
            const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
            const extra = 180;
            setTableScrollY(parent.clientHeight - extra);
        }
        }
        updateTableHeight();
        window.addEventListener('resize', updateTableHeight);
        return () => window.removeEventListener('resize', updateTableHeight);
    }, []);

    const fetchCategories = async () => {
        try {
        setLoading(true);
        const data = await apiService.getCategories();
        setCategories(data);
        setTotal(data.length);
        } catch (error) {
        message.error('Failed to fetch categories');
        console.error(error);
        } finally {
        setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingCategory(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        form.setFieldsValue({ name: category.name });
        setModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        // Test if message works at all
        //message.error('Test error message');
        //message.success('Test success message');
        
        try {
            //console.log('Attempting to delete category:', id);
            await apiService.deleteCategory(id);
            //console.log('Delete API call completed without throwing error');
            message.success('Category deleted successfully');
            fetchCategories();
        } catch (error: any) {
            //console.log('Full error object:', error);
            //console.log('Error response:', error.response);
            //console.log('Error response data:', error.response?.data);
            
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to delete category';
            //console.log('Showing error message:', errorMsg);
            message.error(errorMsg);
        }
    };

    const handleSubmit = async (values: { name: string }) => {
        try {
        if (editingCategory) {
            await apiService.updateCategory(editingCategory.id, values);
            message.success('Category updated successfully');
        } else {
            await apiService.createCategory(values);
            message.success('Category created successfully');
        }
        setModalVisible(false);
        fetchCategories();
        } catch (error: any) {
        const errorMsg = error.response?.data?.error || 'Failed to save category';
        message.error(errorMsg);
        }
    };

    const handleTableChange = (pagination: any) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };

    const columns: ColumnsType<Category> = [
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
        width: '40%',
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
                title="Are you sure you want to delete this category?"
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
        id="categories-table-parent"
        style={{ 
            padding: '24px 24px 0px 24px', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}
        >
        <div 
            className="categories-header"
            style={{ 
            marginBottom: '16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
            }}
        >
            <Title level={2} style={{ margin: 0 }}>Categories</Title>
            <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            >
            Add Category
            </Button>
        </div>

        <Table
            columns={columns}
            dataSource={categories}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} categories`,
            pageSizeOptions: ['5', '10', '15', '20'],
            }}
            onChange={handleTableChange}
            scroll={{ y: tableScrollY }}
        />

        <Modal
            title={editingCategory ? 'Edit Category' : 'Create Category'}
            open={modalVisible}
            onOk={() => form.submit()}
            onCancel={() => setModalVisible(false)}
            destroyOnHidden
            width={400}
        >
            <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item
                name="name"
                label="Category Name"
                rules={[{ required: true, message: 'Please enter category name' }]}
            >
                <Input placeholder="Enter category name" />
            </Form.Item>
            </Form>
        </Modal>
        </div>
    );
};

export default CategoriesTable;