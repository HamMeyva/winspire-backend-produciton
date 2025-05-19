import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  Avatar,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  Check as CheckIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { userAPI } from '../services/api';
import type { User } from '../types';

const Users: React.FC = () => {
  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination and filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'user',
    active: true,
    verified: true
  });
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getAllUsers(1, 100);
      
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle dialog open for edit
  const handleOpenDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      verified: user.verified
    });
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      if (selectedUser?._id) {
        const response = await userAPI.updateUser(
          selectedUser._id,
          formData
        );
        
        if (response.data?.user) {
          setUsers(
            users.map(u => 
              u._id === selectedUser._id ? response.data.user : u
            )
          );
          setSnackbar({
            open: true,
            message: 'User updated successfully!',
            severity: 'success'
          });
        }
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error updating user:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update user. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle user status toggle
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await userAPI.updateUser(userId, {
        active: !currentStatus
      });
      
      if (response.data?.user) {
        setUsers(
          users.map(u => 
            u._id === userId ? response.data.user : u
          )
        );
        
        setSnackbar({
          open: true,
          message: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update user status. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await userAPI.deleteUser(userId);
        
        // Remove from state
        setUsers(users.filter(u => u._id !== userId));
        
        setSnackbar({
          open: true,
          message: 'User deleted successfully!',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error deleting user:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete user. Please try again.',
          severity: 'error'
        });
      }
    }
  };

  // Handle pagination change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Date objesi geçerli bir tarih mi kontrol et
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  // Render loading state
  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Users
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchUsers}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search users by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Subscription</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }} src={user.avatar || undefined}>
                          {user.name.charAt(0)}
                        </Avatar>
                        <Typography>{user.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} 
                        color={user.role === 'admin' ? 'error' : user.role === 'moderator' ? 'warning' : 'default'} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.active ? 'Active' : 'Inactive'} 
                        color={user.active ? 'success' : 'default'} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.subscription?.tier.charAt(0).toUpperCase() + user.subscription?.tier.slice(1)} 
                        color={
                          user.subscription?.tier === 'premium' 
                            ? 'primary' 
                            : user.subscription?.tier === 'basic' 
                              ? 'info' 
                              : 'default'
                        } 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={user.active ? 'Deactivate' : 'Activate'}>
                        <IconButton 
                          onClick={() => handleToggleStatus(user._id, user.active)}
                          color={user.active ? 'warning' : 'success'}
                        >
                          {user.active ? <BlockIcon /> : <CheckIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton 
                          onClick={() => handleOpenDialog(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          onClick={() => handleDeleteUser(user._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {searchTerm ? 'No users match your search' : 'No users found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit User
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="role"
                label="Role"
                select
                value={formData.role}
                onChange={handleInputChange}
                fullWidth
                margin="dense"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="active"
                label="Status"
                select
                value={formData.active ? 'true' : 'false'}
                onChange={(e) => 
                  setFormData({
                    ...formData, 
                    active: e.target.value === 'true'
                  })
                }
                fullWidth
                margin="dense"
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="verified"
                label="Verified"
                select
                value={formData.verified ? 'true' : 'false'}
                onChange={(e) => 
                  setFormData({
                    ...formData, 
                    verified: e.target.value === 'true'
                  })
                }
                fullWidth
                margin="dense"
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={!formData.name || !formData.email}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users; 