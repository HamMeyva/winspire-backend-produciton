import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { RefreshRounded as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            m: 2, 
            maxWidth: '800px', 
            mx: 'auto',
            backgroundColor: '#fff9f9'
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          
          <Typography variant="body1" paragraph>
            The application encountered an error. You can try refreshing the page or click the button below to reset this component.
          </Typography>
          
          <Box sx={{ my: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
              startIcon={<RefreshIcon />}
            >
              Reset
            </Button>
            
            <Button 
              variant="outlined" 
              sx={{ ml: 2 }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Box>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Error details:
            </Typography>
            
            <Box 
              component="pre" 
              sx={{ 
                p: 2, 
                backgroundColor: '#f5f5f5', 
                overflowX: 'auto',
                fontSize: '0.8rem',
                borderRadius: 1
              }}
            >
              {this.state.error?.toString()}
              
              {this.state.errorInfo && (
                <Box component="div" sx={{ mt: 2 }}>
                  {this.state.errorInfo.componentStack}
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 