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
  Chip,
  CircularProgress,
  Grid,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { subscriptionAPI } from '../services/api';
import type { SubscriptionPlan } from '../types';

const SubscriptionManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    description: '',
    tier: 'basic',
    features: [],
    active: true,
    limits: {
      dailyContent: 5,
      categoryAccess: 3,
      offlineAccess: false,
      premiumContent: false,
      aiAssistants: false,
      maxDevices: 1
    },
    metadata: {}
  });
  
  // Feature input state
  const [featureInput, setFeatureInput] = useState('');
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Fetch subscription plans on component mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionAPI.getAllPlans();
      
      if ((response.success || response.status === 'success') && response.data?.plans) {
        setPlans(response.data.plans);
      } else {
        setError('Failed to load subscription plans. Unexpected response format.');
      }
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      setError('Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode: 'add' | 'edit' | 'view', plan?: SubscriptionPlan) => {
    setDialogMode(mode);
    
    if (mode === 'add') {
      setSelectedPlan(null);
      setFormData({
        name: '',
        description: '',
        tier: 'basic',
        features: [],
        active: true,
        limits: {
          dailyContent: 5,
          categoryAccess: 3,
          offlineAccess: false,
          premiumContent: false,
          aiAssistants: false,
          maxDevices: 1
        },
        metadata: {}
      });
    } else if (plan) {
      setSelectedPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description,
        tier: plan.tier,
        features: [...plan.features],
        active: plan.active,
        limits: { ...plan.limits },
        metadata: { ...plan.metadata }
      });
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFeatureInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('limits.')) {
      const limitKey = name.split('.')[1];
      setFormData({
        ...formData,
        limits: {
          ...formData.limits,
          [limitKey]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleFeatureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeatureInput(e.target.value);
  };

  const handleAddFeature = () => {
    if (featureInput.trim() && formData.features) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    if (formData.features) {
      const newFeatures = [...formData.features];
      newFeatures.splice(index, 1);
      setFormData({
        ...formData,
        features: newFeatures
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        setSnackbar({
          open: true,
          message: 'Plan name is required',
          severity: 'error'
        });
        return;
      }

      // Create slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      if (dialogMode === 'add') {
        const response = await subscriptionAPI.createPlan({
          ...formData,
          slug
        });
        
        if (response.success && response.data?.plan) {
          setPlans([...plans, response.data.plan]);
          setSnackbar({
            open: true,
            message: 'Subscription plan created successfully!',
            severity: 'success'
          });
        }
      } else if (selectedPlan) {
        const response = await subscriptionAPI.updatePlan(selectedPlan._id, formData);
        
        if (response.success && response.data?.plan) {
          setPlans(plans.map(plan => 
            plan._id === selectedPlan._id ? response.data.plan : plan
          ));
          setSnackbar({
            open: true,
            message: 'Subscription plan updated successfully!',
            severity: 'success'
          });
        }
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving subscription plan:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save subscription plan. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (window.confirm('Are you sure you want to delete this subscription plan? This will not affect existing subscribers.')) {
      try {
        await subscriptionAPI.deletePlan(planId);
        
        setPlans(plans.filter(plan => plan._id !== planId));
        
        setSnackbar({
          open: true,
          message: 'Subscription plan deleted successfully!',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error deleting subscription plan:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete subscription plan. Please try again.',
          severity: 'error'
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Render loading state
  if (loading && plans.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Subscription Plans
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage subscription tiers for your app (IAP handled by the App Store)
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchPlans}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
          >
            Add Plan
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>App Store Compliance</AlertTitle>
        Subscription payments are handled via in-app purchases. This dashboard only manages the subscription tiers and features.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {plans.length === 0 ? (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" mb={2}>
            No subscription plans found. Create your first plan to get started.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
          >
            Add Plan
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan._id}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  opacity: plan.active ? 1 : 0.7,
                  border: plan.tier === 'premium' ? '2px solid #f9a825' : 'none'
                }}
              >
                {!plan.active && (
                  <Chip 
                    label="Inactive" 
                    color="default" 
                    size="small" 
                    sx={{ position: 'absolute', top: 10, right: 10 }}
                  />
                )}
                <CardContent>
                  <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {plan.description}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Features:
                  </Typography>
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Limits:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip 
                      label={`${plan.limits.dailyContent} daily items`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`${plan.limits.categoryAccess} categories`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`${plan.limits.maxDevices} devices`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    {plan.limits.offlineAccess && (
                      <Chip 
                        label="Offline access" 
                        size="small" 
                        color="success"
                      />
                    )}
                    {plan.limits.premiumContent && (
                      <Chip 
                        label="Premium content" 
                        size="small" 
                        color="success"
                      />
                    )}
                    {plan.limits.aiAssistants && (
                      <Chip 
                        label="AI assistants" 
                        size="small" 
                        color="success"
                      />
                    )}
                  </Box>
                </CardContent>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => handleOpenDialog('view', plan)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog('edit', plan)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDeletePlan(plan._id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Subscription Plan Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' 
            ? 'Add New Subscription Plan' 
            : dialogMode === 'edit' 
              ? 'Edit Subscription Plan' 
              : 'View Subscription Plan'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Plan Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="tier"
                label="Tier"
                select
                SelectProps={{ native: true }}
                value={formData.tier}
                onChange={handleInputChange}
                fullWidth
                margin="dense"
                disabled={dialogMode === 'view'}
                helperText="Used for IAP product ID mapping"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Features
              </Typography>
              {dialogMode !== 'view' && (
                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    label="New Feature"
                    value={featureInput}
                    onChange={handleFeatureInputChange}
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddFeature}
                    disabled={!featureInput.trim()}
                  >
                    Add
                  </Button>
                </Box>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.features?.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    onDelete={dialogMode !== 'view' ? () => handleRemoveFeature(index) : undefined}
                    color="primary"
                  />
                ))}
                {formData.features?.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No features added yet
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Limits
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    name="limits.dailyContent"
                    label="Daily Content Limit"
                    type="number"
                    value={formData.limits?.dailyContent}
                    onChange={handleInputChange}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0 } }}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    name="limits.categoryAccess"
                    label="Category Access"
                    type="number"
                    value={formData.limits?.categoryAccess}
                    onChange={handleInputChange}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0 } }}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    name="limits.maxDevices"
                    label="Max Devices"
                    type="number"
                    value={formData.limits?.maxDevices}
                    onChange={handleInputChange}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 1 } }}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="limits.offlineAccess"
                        checked={formData.limits?.offlineAccess}
                        onChange={handleInputChange}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="Offline Access"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="limits.premiumContent"
                        checked={formData.limits?.premiumContent}
                        onChange={handleInputChange}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="Premium Content"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="limits.aiAssistants"
                        checked={formData.limits?.aiAssistants}
                        onChange={handleInputChange}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="AI Assistants"
                  />
                </Grid>
              </Grid>
            </Grid>
            {dialogMode !== 'view' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                    />
                  }
                  label="Active"
                />
                <Tooltip title="Inactive plans will not be shown in the app">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={!formData.name}
            >
              {dialogMode === 'add' ? 'Create' : 'Update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default SubscriptionManager; 