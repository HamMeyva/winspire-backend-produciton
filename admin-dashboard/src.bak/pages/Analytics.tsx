import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Tab,
  Tabs,
  useTheme
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../services/api';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`,
  };
}

const Analytics: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, any>>({
    dashboard: {},
    users: {},
    content: {},
    subscriptions: {}
  });
  const theme = useTheme();

  // Colors for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch content and user analytics
        try {
          const [contentData, usersData] = await Promise.all([
            analyticsAPI.getContentAnalytics(),
            analyticsAPI.getUserAnalytics()
          ]);
          
          // Build dashboard data from the available information
          const dashboardData = {
            totalUsers: usersData.data?.totalUsers || 0,
            totalContents: contentData.data?.totalContents || 0,
            activeUsers: usersData.data?.activeUsers || 0,
            contentViews: contentData.data?.totalViews || 0
          };
          
          setData({
            dashboard: dashboardData,
            users: usersData.data || {},
            content: contentData.data || {},
            subscriptions: {}  // We'll handle this later if needed
          });
        } catch (apiError) {
          console.error('Error fetching analytics data from API:', apiError);
          setError('Failed to load analytics data. Please check API connection.');
          
          // Set placeholder data if API fails
          setData({
            dashboard: {
              totalUsers: 0,
              totalContents: 0,
              activeUsers: 0,
              contentViews: 0
            },
            users: {},
            content: {},
            subscriptions: {}
          });
        }
      } catch (err) {
        console.error('Error in analytics data fetching:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" fontWeight="bold" mb={3}>
          Analytics
        </Typography>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Box>
    );
  }

  // Prepare user data for charts
  const userRetentionData = data.users.retention?.map((item: any) => ({
    month: item.month,
    value: item.rate
  })) || [];

  const userAcquisitionData = data.users.acquisition?.map((item: any) => ({
    source: item.source,
    count: item.count
  })) || [];

  const userGrowthData = data.users.growth?.map((item: any) => ({
    date: item.date,
    new: item.new,
    total: item.total
  })) || [];

  // Prepare content data for charts
  const contentEngagementData = data.content.engagement?.map((item: any) => ({
    category: item.category,
    views: item.views,
    likes: item.likes,
    dislikes: item.dislikes
  })) || [];

  const contentDistributionData = data.content.distribution?.map((item: any) => ({
    name: item.status,
    value: item.count
  })) || [];

  // Prepare subscription data for charts
  const subscriptionRevenueData = data.subscriptions.revenue?.map((item: any) => ({
    month: item.month,
    amount: item.amount
  })) || [];

  const subscriptionTierData = data.subscriptions.tiers?.map((item: any) => ({
    name: item.tier,
    value: item.count
  })) || [];

  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" mb={3}>
        Analytics
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="User Analytics" {...a11yProps(0)} />
          <Tab label="Content Analytics" {...a11yProps(1)} />
          <Tab label="Subscription Analytics" {...a11yProps(2)} />
        </Tabs>

        {/* User Analytics Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            User Analytics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="User Growth" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={userGrowthData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="new" stroke={theme.palette.primary.main} name="New Users" />
                        <Line type="monotone" dataKey="total" stroke={theme.palette.secondary.main} name="Total Users" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Retention Rate" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={userRetentionData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill={theme.palette.primary.main} name="Retention Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="User Acquisition" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userAcquisitionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {userAcquisitionData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Content Analytics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Content Analytics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Content Engagement by Category" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={contentEngagementData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="views" fill={theme.palette.primary.main} name="Views" />
                        <Bar dataKey="likes" fill={theme.palette.success.main} name="Likes" />
                        <Bar dataKey="dislikes" fill={theme.palette.error.main} name="Dislikes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Content Status Distribution" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {contentDistributionData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Subscription Analytics Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Subscription Analytics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Monthly Revenue" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={subscriptionRevenueData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`$${value}`, 'Revenue']}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="amount" stroke={theme.palette.success.main} name="Revenue" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Subscription Tiers" />
                <Divider />
                <CardContent>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subscriptionTierData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {subscriptionTierData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Analytics; 