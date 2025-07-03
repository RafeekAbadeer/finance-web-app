import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { DashboardOutlined, TransactionOutlined, BankOutlined, SettingOutlined } from '@ant-design/icons';
import TransactionTable from './components/TransactionTable';
import TransactionMasterDetail from './components/TransactionTable';
import AccountsTable from './components/AccountsTable';
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
        return <TransactionMasterDetail />;
      case 'accounts':
        return <AccountsTable />;
      case 'settings':
        return <Title level={2}>Settings - Coming Soon!</Title>;
      default:
        return <Title level={2}>Dashboard</Title>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: '0 24px', background: '#001529', height: 64, lineHeight: '64px' }}>
        <Title level={3} style={{ color: 'white', margin: 0, lineHeight: '64px' }}>
          Finance Manager
        </Title>
      </Header>
      <Layout style={{ flex: 1, display: 'flex' }}>
        <Sider
          width={200}
          style={{
            background: '#fff',
            border: '1px solid yellow',
            paddingTop: 24,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ height: '100%', borderRight: 0, overflow: 'auto' }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '0 0 0 16px', flex: 1, display: 'flex' }}>
          <Content
            style={{
              padding: 0,
              margin: 0,
              minHeight: 0,
              background: '#fff',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              boxSizing: 'border-box',
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