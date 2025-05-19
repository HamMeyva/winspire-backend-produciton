import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  Grid,
  Link,
  Paper,
  Alert,
  CircularProgress,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(error || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use a light theme specifically for the login page
  const theme = createTheme({
    palette: {
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Windspire Admin
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
              <Grid container>
                <Grid item xs={12} sm={6}>
                  <Link href="#" variant="body2">
                    Forgot password?
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Login; 