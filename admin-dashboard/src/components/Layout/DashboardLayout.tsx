import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, Toolbar, useMediaQuery, createTheme, ThemeProvider } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width:1200px)');
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Custom theme with light/dark mode
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  // Close sidebar on small screens
  useEffect(() => {
    setOpen(!isSmallScreen);
  }, [isSmallScreen]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleToggleSidebar = () => {
    setOpen(!open);
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', String(!isDarkMode));
  };

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    } else {
      // Check if user prefers dark mode
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDarkMode);
    }
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />
        
        {/* Header */}
        <Header 
          onToggleSidebar={handleToggleSidebar} 
          isDarkMode={isDarkMode} 
          onToggleDarkMode={handleToggleDarkMode} 
        />
        
        {/* Sidebar */}
        <Sidebar 
          open={open} 
          onClose={() => setOpen(false)} 
          variant={isSmallScreen ? 'temporary' : 'permanent'} 
        />
        
        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${open ? 240 : 0}px)` },
            mt: 8,
            backgroundColor: theme.palette.background.default,
            height: '100%',
            overflow: 'auto'
          }}
        >
          <Toolbar />
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default DashboardLayout; 