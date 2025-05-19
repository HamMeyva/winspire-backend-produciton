import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isDarkMode, onToggleDarkMode }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: 1
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Windspire Admin
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            onClick={onToggleDarkMode}
            sx={{ ml: 1 }}
            aria-label="toggle dark mode"
          >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleNotificationMenu}
            sx={{ ml: 1 }}
            aria-label="notifications"
          >
            <NotificationsIcon />
          </IconButton>
          <Menu
            id="notification-menu"
            anchorEl={notificationAnchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(notificationAnchorEl)}
            onClose={handleNotificationClose}
          >
            <MenuItem onClick={handleNotificationClose}>No new notifications</MenuItem>
          </Menu>

          <Box sx={{ ml: 2 }}>
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleMenu}
                sx={{ p: 0 }}
                aria-label="account"
              >
                {user?.avatar ? (
                  <Avatar src={user.avatar} alt={user.name} />
                ) : (
                  <Avatar>
                    <AccountCircle />
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleClose}>Settings</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 