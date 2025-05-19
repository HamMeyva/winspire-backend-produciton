import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Content from './pages/Content';
import Prompts from './pages/Prompts';
import DeletedContent from './pages/DeletedContent';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="categories" element={<Categories />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="content" element={
              <ErrorBoundary>
                <Content />
              </ErrorBoundary>
            } />
            <Route path="prompts" element={<Prompts />} />
            <Route path="deleted" element={<DeletedContent />} />
            <Route path="subscriptions" element={<div>Subscriptions Page (Coming Soon)</div>} />
            <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
