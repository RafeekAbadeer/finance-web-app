import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { DashboardOutlined, TransactionOutlined, BankOutlined, SettingOutlined } from '@ant-design/icons';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const [selectedKey, setSelectedKey] = React.useState('dashboard');
  const [apiStatus, setApiStatus] = React.useState<string>('Testing...');
  const [transactions, setTransactions] = React.useState<any[]>([]);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'transactions',
      icon: <TransactionOutlined />,
      label: 'Transactions',
    },
    {
      key: 'accounts',
      icon: <BankOutlined />,
      label: 'Accounts',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  // Test API connection when dashboard is selected
  React.useEffect(() => {
    if (selectedKey === 'dashboard') {
      import('./services/api').then(({ apiService }) => {
        apiService.testConnection()
          .then(message => setApiStatus(`✅ ${message}`))
          .catch(error => setApiStatus(`❌ API Error: ${error.message}`));
        
        apiService.getTransactions()
          .then(data => setTransactions(data))
          .catch(error => console.error('Transactions error:', error));
      });
    }
  }, [selectedKey]);

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div>
            <Title level={2}>Dashboard</Title>
            <p><strong>API Status:</strong> {apiStatus}</p>
            <p><strong>Transactions Count:</strong> {transactions.length}</p>
          </div>
        );
      case 'transactions':
        return <Title level={2}>Transactions - Coming Soon!</Title>;
      case 'accounts':
        return <Title level={2}>Accounts - Coming Soon!</Title>;
      case 'settings':
        return <Title level={2}>Settings - Coming Soon!</Title>;
      default:
        return <Title level={2}>Dashboard</Title>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: '0 24px', background: '#001529' }}>
        <Title level={3} style={{ color: 'white', margin: '16px 0' }}>
          Finance Manager
        </Title>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: 8,
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;