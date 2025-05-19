import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Button,
  useTheme,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  LocalOffer as SubscriptionIcon,
  Visibility as ViewsIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { analyticsAPI, categoryAPI, contentAPI } from '../services/api';
import DailyContentGenerator from '../components/DailyContentGenerator';
import type { AnalyticsData, Category } from '../types';
import { Link } from 'react-router-dom';

// Mock data in case the API doesn't return real data
const mockAnalyticsData: AnalyticsData = {
  totalUsers: 1245,
  activeSubscriptions: 528,
  contentViews: 45789,
  contentRating: 87,
  newUsers: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    data: [65, 78, 90, 105, 125, 150, 180]
  },
  subscriptionTiers: {
    labels: ['Free', 'Basic', 'Premium'],
    data: [700, 400, 145]
  },
  popularCategories: {
    labels: ['Health', 'Productivity', 'Cooking', 'Finance', 'Mindfulness'],
    data: [320, 280, 190, 140, 120]
  }
};

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#3498DB'];

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>(mockAnalyticsData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [deletedContentCount, setDeletedContentCount] = useState<number>(0);
  const theme = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories with pool statistics
        const catResponse = await categoryAPI.getCategoriesWithPoolStats();
        if (catResponse.data?.categories) {
          setCategories(catResponse.data.categories);
        }
        
        // Fetch deleted content count
        try {
          const deletedResponse = await contentAPI.getDeletedContent(1, 1); // Just get one item to get total count
          if (deletedResponse.data) {
            setDeletedContentCount(deletedResponse.data.totalCount || 0);
          }
        } catch (deletedError) {
          console.log('Deleted content count not available', deletedError);
          setDeletedContentCount(0);
        }
        
        // Fetch analytics data if available
        try {
          const analyticsResponse = await analyticsAPI.getContentAnalytics();
          if (analyticsResponse.data) {
            setStats(analyticsResponse.data);
          }
        } catch (analyticsError) {
          console.log('Analytics data not available, using basic stats');
        }
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getTotalItems = (category: Category) => {
    if (!category.pools) return 0;
    return Object.values(category.pools).reduce((sum, count) => sum + (count || 0), 0);
  };
  
  const getTotalContentCount = () => {
    return categories.reduce((sum, cat) => sum + getTotalItems(cat), 0);
  };
  
  const getCategoriesWithLowContent = () => {
    return categories
      .filter(cat => getTotalItems(cat) < 10) // Categories with less than 10 items
      .sort((a, b) => getTotalItems(a) - getTotalItems(b));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Prepare data for charts
  const newUsersData = analytics.newUsers.labels.map((month, index) => ({
    month,
    users: analytics.newUsers.data[index]
  }));

  const subscriptionData = analytics.subscriptionTiers.labels.map((tier, index) => ({
    name: tier,
    value: analytics.subscriptionTiers.data[index]
  }));

  const categoryData = analytics.popularCategories.labels.map((category, index) => ({
    category,
    users: analytics.popularCategories.data[index]
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" fontWeight="bold" mb={4}>
        Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Content Overview" />
            <CardContent>
              <Typography variant="h3" component="div" fontWeight="bold" color="primary">
                {getTotalContentCount()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total content items across all categories
              </Typography>
              <Box mt={2} display="flex" gap={1}>
                <Button 
                  component={Link} 
                  to="/content"
                  variant="outlined" 
                  color="primary"
                  size="small"
                >
                  Manage Content
                </Button>
                <DailyContentGenerator 
                  buttonText="Test Daily Generation"
                  variant="outlined"
                  color="secondary"
                  fullWidth={false}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Categories" />
            <CardContent>
              <Typography variant="h3" component="div" fontWeight="bold" color="secondary">
                {categories.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total active categories
              </Typography>
              <Box mt={2}>
                <Button 
                  component={Link} 
                  to="/categories"
                  variant="outlined" 
                  color="secondary"
                  size="small"
                >
                  Manage Categories
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Content Pools" />
            <CardContent>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Regular:</Typography>
                  <Typography variant="body2" color="text.secondary">Accepted:</Typography>
                  <Typography variant="body2" color="text.secondary">Highly Liked:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    {categories.reduce((sum, cat) => sum + (cat.pools?.regular || 0), 0)}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {categories.reduce((sum, cat) => sum + (cat.pools?.accepted || 0), 0)}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {categories.reduce((sum, cat) => sum + (cat.pools?.highly_liked || 0), 0)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Deleted Content" />
            <CardContent>
              <Typography variant="h3" component="div" fontWeight="bold" color="error">
                {deletedContentCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total items in deleted state
              </Typography>
              <Box mt={2}>
                <Button 
                  component={Link} 
                  to="/deleted-content"
                  variant="outlined" 
                  color="error"
                  size="small"
                >
                  View Deleted Items
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Categories needing content */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="medium" mb={2}>
              Categories Needing Content
            </Typography>
            {getCategoriesWithLowContent().length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                All categories have sufficient content
              </Typography>
            ) : (
              <List dense>
                {getCategoriesWithLowContent().slice(0, 5).map((category) => (
                  <React.Fragment key={category._id}>
                    <ListItem
                      secondaryAction={
                        <Button 
                          variant="text" 
                          color="primary"
                          size="small"
                          component={Link}
                          to={`/categories`}
                          state={{ selectedCategory: category._id }}
                        >
                          Generate
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={category.name}
                        secondary={`${getTotalItems(category)} items`}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Top Categories by Content */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="medium" mb={2}>
              Top Categories by Content
            </Typography>
            <List dense>
              {[...categories]
                .sort((a, b) => getTotalItems(b) - getTotalItems(a))
                .slice(0, 5)
                .map((category) => (
                  <React.Fragment key={category._id}>
                    <ListItem>
                      <ListItemText
                        primary={category.name}
                        secondary={`${getTotalItems(category)} items`}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 