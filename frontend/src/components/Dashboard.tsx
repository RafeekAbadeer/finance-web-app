import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, message, Progress, Select } from 'antd';
import { 
  DollarOutlined, 
  BankOutlined, 
  RiseOutlined, 
  FallOutlined,
  CreditCardOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { apiService, DashboardData, AccountBalance, CreditCardDue, Transaction, MonthlyTrend, 
    YearlyTrend } from '../services/api';
import type { ColumnsType } from 'antd/es/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar } from 'recharts';
const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [tableScrollY, setTableScrollY] = useState(300);
    const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
    const [yearlyTrends, setYearlyTrends] = useState<YearlyTrend[]>([]);
    const [incomeExpensePeriod, setIncomeExpensePeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [netWorthPeriod, setNetWorthPeriod] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
    loadDashboardData();
    }, []);

    useEffect(() => {
    function updateTableHeight() {
        const parent = document.getElementById('dashboard-parent');
        if (parent) {
        const header = parent.querySelector('.dashboard-header');
        const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
        const extra = 400; // Account for summary cards and spacing
        setTableScrollY(Math.max(200, parent.clientHeight - extra));
        }
    }
    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);
    return () => window.removeEventListener('resize', updateTableHeight);
    }, []);

    const loadDashboardData = async () => {
    try {
        setLoading(true);
        const [dashboardData, monthlyData, yearlyData] = await Promise.all([
			apiService.getDashboardData(),
			apiService.getMonthlyTrends(12),
			apiService.getYearlyTrends(3)
		]);
		
		setDashboardData(dashboardData);
		setMonthlyTrends(monthlyData);
		setYearlyTrends(yearlyData);
    } catch (error) {
        message.error('Failed to load dashboard data');
        console.error('Dashboard error:', error);
    } finally {
        setLoading(false);
    }
    };

    const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
    };

    const accountBalanceColumns: ColumnsType<AccountBalance> = [
    {
        title: 'Account',
        dataIndex: 'name',
        key: 'name',
        width: '30%',
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        width: '20%',
        filters: Array.from(new Set(dashboardData?.accountBalances.map(a => a.category) || [])).map(cat => ({
        text: cat,
        value: cat,
        })),
        onFilter: (value, record) => record.category === value,
        sorter: (a, b) => a.category.localeCompare(b.category),
    },
    {
        title: 'Balance',
        dataIndex: 'balance',
        key: 'balance',
        width: '20%',
        align: 'right',
        sorter: (a, b) => a.balance - b.balance,
        render: (balance: number) => (
        <Tag color={balance >= 0 ? 'green' : 'red'} style={{ margin: 0 }}>
            {formatCurrency(Math.abs(balance))}
        </Tag>
        ),
    },
    {
        title: 'Currency',
        dataIndex: 'currency',
        key: 'currency',
        width: '15%',
        filters: Array.from(new Set(dashboardData?.accountBalances.map(a => a.currency) || [])).map(curr => ({
        text: curr,
        value: curr,
        })),
        onFilter: (value, record) => record.currency === value,
    },
    {
        title: 'Type',
        key: 'type',
        width: '15%',
        render: (_, record) => (
        <div>
            {record.is_credit_card && (
            <Tag color="purple" style={{ marginBottom: 2 }}>
                Credit Card
            </Tag>
            )}
            <Tag color="blue">{record.nature}</Tag>
        </div>
        ),
    },
    ];

    const creditCardColumns: ColumnsType<CreditCardDue> = [
    {
        title: 'Card',
        dataIndex: 'account_name',
        key: 'account_name',
        width: '25%',
        ellipsis: true,
        sorter: (a, b) => a.account_name.localeCompare(b.account_name),
    },
    {
        title: 'Balance',
        dataIndex: 'current_balance',
        key: 'current_balance',
        width: '20%',
        align: 'right',
        sorter: (a, b) => a.current_balance - b.current_balance,
        render: (balance: number) => (
        <Tag color={balance > 0 ? 'red' : 'green'} style={{ margin: 0 }}>
            {formatCurrency(Math.abs(balance))}
        </Tag>
        ),
    },
    {
        title: 'Limit',
        dataIndex: 'credit_limit',
        key: 'credit_limit',
        width: '15%',
        align: 'right',
        sorter: (a, b) => a.credit_limit - b.credit_limit,
        render: (limit: number) => formatCurrency(limit),
    },
    {
        title: 'Utilization',
        dataIndex: 'utilization_percentage',
        key: 'utilization_percentage',
        width: '20%',
        sorter: (a, b) => a.utilization_percentage - b.utilization_percentage,
        render: (utilization: number) => (
        <Progress 
            percent={utilization} 
            size="small" 
            status={utilization > 80 ? 'exception' : utilization > 60 ? 'active' : 'success'}
        />
        ),
    },
    {
        title: 'Due Date',
        dataIndex: 'due_date',
        key: 'due_date',
        width: '20%',
        sorter: (a, b) => a.days_until_due - b.days_until_due,
        render: (date: string, record) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear().toString().slice(-2);
        return (
            <div>
            <div>{`${day}.${month}.${year}`}</div>
            <Text type={record.days_until_due <= 7 ? 'danger' : 'secondary'} style={{ fontSize: '12px' }}>
                {record.days_until_due} days
            </Text>
            </div>
        );
        },
    },
    ];

    if (!dashboardData) {
    return (
        <div
        id="dashboard-parent"
        style={{
            padding: '24px 24px 24px 24px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0, // Add this
            overflow: 'hidden' // Add this
        }}
        >
        <div className="dashboard-header">
            <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        </div>
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <Text>Loading dashboard...</Text>
        </div>
        </div>
    );
    }

    const { summary, accountBalances, recentTransactions, creditCardDues } = dashboardData;

    return (
    <div
        id="dashboard-parent"
        style={{
        padding: '24px 24px 24px 24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        }}
    >
        <div
        className="dashboard-header"
        style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}
        >
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        </div>
        
        {/* Key Financial Metrics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
            <Card size="small">
            <Statistic
                title="Net Worth"
                value={Math.abs(summary.netWorth)}
                precision={2}
                valueStyle={{ color: summary.netWorth >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={summary.netWorth >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
            <Card size="small">
            <Statistic
                title="Total Assets"
                value={Math.abs(summary.totalAssets)}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
                prefix={<BankOutlined />}
            />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
            <Card size="small">
            <Statistic
                title="Total Liabilities"
                value={Math.abs(summary.totalLiabilities)}
                precision={2}
                valueStyle={{ color: '#cf1322' }}
                prefix={<FallOutlined />}
            />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
            <Card size="small">
            <Statistic
                title="Net Income"
                value={Math.abs(summary.netIncome)}
                precision={2}
                valueStyle={{ color: summary.netIncome >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={summary.netIncome >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            </Card>
        </Col>
        </Row>

        {/* Monthly Liabilities */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8}>
            <Card size="small">
            <Statistic
                title="This Month Liabilities"
                value={0} // Will be implemented in backend
                precision={2}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CalendarOutlined />}
            />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
            <Card size="small">
            <Statistic
                title="Next Month Liabilities"
                value={0} // Will be implemented in backend
                precision={2}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CalendarOutlined />}
            />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
            <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
                <div>
                <Text type="secondary" style={{ fontSize: '14px' }}>Quick Stats</Text>
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <Text strong>{summary.accountCount} Accounts</Text>
                    <Text strong>{summary.transactionCount} Transactions</Text>
                </div>
                </div>
            </div>
            </Card>
        </Col>
        </Row>

        {/* Charts Section */}
      <div style={{ flex: 1, minHeight: 0, marginTop: '16px' }}>
        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          <Col xs={24} lg={12} style={{ height: '100%' }}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Income & Expenses</span>
                  <Select
                    value={incomeExpensePeriod}
                    onChange={setIncomeExpensePeriod}
                    size="small"
                    style={{ width: 100 }}
                  >
                    <Select.Option value="monthly">Monthly</Select.Option>
                    <Select.Option value="yearly">Yearly</Select.Option>
                  </Select>
                </div>
              }
              size="small" 
              style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: 0
              }}
              bodyStyle={{ 
                flex: 1, 
                minHeight: 0,
                padding: '12px'
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeExpensePeriod === 'monthly' ? monthlyTrends : yearlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={incomeExpensePeriod === 'monthly' ? 'month' : 'year'} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(2), '']}
                    labelFormatter={(label) => `${incomeExpensePeriod === 'monthly' ? 'Month' : 'Year'}: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#52c41a" name="Income" />
                  <Bar dataKey="expenses" fill="#ff4d4f" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ height: '100%' }}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Net Worth & Income</span>
                  <Select
                    value={netWorthPeriod}
                    onChange={setNetWorthPeriod}
                    size="small"
                    style={{ width: 100 }}
                  >
                    <Select.Option value="monthly">Monthly</Select.Option>
                    <Select.Option value="yearly">Yearly</Select.Option>
                  </Select>
                </div>
              }
              size="small" 
              style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: 0
              }}
              bodyStyle={{ 
                flex: 1, 
                minHeight: 0,
                padding: '12px'
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorthPeriod === 'monthly' ? monthlyTrends : yearlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={netWorthPeriod === 'monthly' ? 'month' : 'year'} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(2), '']}
                    labelFormatter={(label) => `${netWorthPeriod === 'monthly' ? 'Month' : 'Year'}: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="net_income" 
                    stroke="#1890ff" 
                    name="Net Income"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net_assets" 
                    stroke="#722ed1" 
                    name="Net Assets"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
    );
};

export default Dashboard;