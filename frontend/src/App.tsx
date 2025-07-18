import React from 'react';
import { Layout, Menu, Typography, message, Button, Modal } from 'antd';
import { DashboardOutlined, TransactionOutlined, BankOutlined, SettingOutlined, TagsOutlined, 
  DollarOutlined, AppstoreOutlined, FolderOutlined, TagOutlined, UnorderedListOutlined 
} from '@ant-design/icons';
import TransactionTable from './components/TransactionTable';
import TransactionMasterDetail from './components/TransactionTable';
import AccountsTable from './components/AccountsTable';
import CategoriesTable from './components/CategoriesTable';
import CurrenciesTable from './components/CurrenciesTable';
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
      children: [
        {
          key: 'categories',
          icon: <TagsOutlined  />,
          label: 'Categories',
        },
        {
          key: 'currencies',
          icon: <DollarOutlined />, 
          label: 'Currencies',
        }
      ]
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
  React.useEffect(() => {
    message.config({
      top: 100,
      duration: 3,
      maxCount: 3,
    });
  }, []);

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div style={{padding: '0 24px'}}>
            <Title level={2}>Dashboard</Title>
            <p><strong>API Status:</strong> {apiStatus}</p>
            <p><strong>Transactions Count:</strong> {transactions.length}</p>
            <Button onClick={() => {
              console.log('Button clicked, trying to show modal');
              Modal.info({ 
                title: 'Test', 
                content: 'Modal works!',
                //onOk: () => console.log('Modal OK clicked')
              });
              //console.log('Modal.info called');
            }}>
              Test Modal
            </Button>
          </div>
        );
      case 'transactions':
        return <TransactionMasterDetail />;
      case 'accounts':
        return <AccountsTable />;
      case 'categories':
        return <CategoriesTable />;
      case 'currencies':
        return <CurrenciesTable />;
      case 'settings':
        return <Title level={2} style={{padding: '0 24px'}}>Settings - Coming Soon!</Title>;
      default:
        return <Title level={2}>Dashboard</Title>;
    }
  };

  return (
    <>
      <Layout style={{ minHeight: 'calc(100vh-64px)', /*border: '3px solid purple'*/}} /*className="main-layout"*/>
        <Header style={{ /*padding: '0 24px',*/ /*background: 'transparent',*/background: '#001529', height: 64, /*lineHeight: '64px'*/ }}>
          <Title level={3} style={{ color: 'lightgray', margin: 0, lineHeight: '64px' }}>
            Finance Manager
          </Title>
        </Header>
        <Layout style={{ flex: 1, display: 'flex', height: 'calc(100vh - 64px)', padding: '76px 0px 0px 0px' }}>
            <Sider
              width={200}
              theme='light'
              style={{
                background: 'transparent', // You can change this to '#fff' or any color you prefer
                //border: '3px solid yellow',
                //paddingTop: 24,
                padding: '0 0px 16px 16px',
                //borderRadius: 8,
                height: '100%', // Ensure Sider fills the parent's height
              }}
            >
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                onClick={({ key }) => setSelectedKey(key)}
                style={{ background: '#fff', padding: 8,//border: '3px solid black',
                  height: '100%', borderRight: 0, overflow: 'auto', borderRadius: 8 }}
                items={menuItems}
              />
            </Sider>
          <Layout style={{ padding: '0 16px 16px 16px', margin: 0, flex: 1, display: 'flex', height: '100%' }}>
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
    </>
  );
}

export default App;