import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
  Divider,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Category as CategoryIcon,
  Article as ContentIcon,
  Payment as SubscriptionIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  BarChart as AnalyticsIcon,
  CardMembership as CardMembershipIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant: 'permanent' | 'persistent' | 'temporary';
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant }) => {
  const theme = useTheme();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Content', icon: <ContentIcon />, path: '/content' },
    { text: 'Categories', icon: <CategoryIcon />, path: '/categories' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Subscriptions', icon: <SubscriptionIcon />, path: '/subscriptions' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;

  const drawer = (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Windspire Admin
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isActive(item.path)}
              sx={{
                bgcolor: isActive(item.path) ? theme.palette.action.selected : 'transparent',
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? theme.palette.primary.main : theme.palette.text.secondary,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{
                  color: isActive(item.path) ? theme.palette.primary.main : theme.palette.text.primary,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
};

export default Sidebar; 