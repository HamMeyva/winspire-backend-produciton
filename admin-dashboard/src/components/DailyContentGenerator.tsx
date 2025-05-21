import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { categoryAPI, contentAPI } from '../services/api';

interface DailyContentGeneratorProps {
  buttonText?: string;
  variant?: "text" | "outlined" | "contained";
  color?: "primary" | "secondary" | "success" | "error" | "info" | "warning" | "inherit";
  fullWidth?: boolean;
}

/**
 * Component that handles daily content generation checking and execution
 * - Checks if each category has 10 prompts generated in the last 24 hours
 * - Generates new prompts for categories that need them
 * - Moves previously shown prompts to deleted status
 */
const DailyContentGenerator: React.FC<DailyContentGeneratorProps> = ({
  buttonText = "Test Daily Content Generation",
  variant = "contained",
  color = "primary",
  fullWidth = false
}) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<null | {
    categoriesProcessed: number;
    totalGenerated: number;
    totalMoved: number;
    totalPublished: number;
    errors: string[];
  }>(null);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset results when dialog is closed
    setResults(null);
  };

  /**
   * Helper function to add a delay between API calls
   * @param ms Milliseconds to delay
   */
  const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * Get model to use based on index to alternate between models
   * @param index The current index in the generation loop
   * @returns The model name to use
   */
  const getModelForIndex = (index: number): string => {
    // Alternate between gpt-4o and gpt-4.1 models
    return index % 2 === 0 ? 'gpt-4o' : 'gpt-4.1';
  };

  const checkAndGenerateContent = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('Triggering daily content refresh on backend...');
      
      // Get the JWT token and make sure we're authenticated
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You are not logged in. Please log in to access');
      }
      
      // Call the API using a properly formatted fetch request with the token
      // Use the correct API URL with the configured base URL from env variables
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010/api';
      const refreshResponse = await fetch(`${API_URL}/admin/trigger-daily-refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!refreshResponse.ok) {
        if (refreshResponse.status === 401) {
          throw new Error('You are not logged in. Please log in to access');
        }
        const errorData = await refreshResponse.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to trigger daily content refresh');
      }
      
      const responseData = await refreshResponse.json();
      
      console.log('Daily content refresh completed successfully:', responseData);
      
      // Set results based on backend response
      setResults({
        categoriesProcessed: responseData.data?.categories || 0,
        totalGenerated: responseData.data?.generated || 0,
        totalMoved: responseData.data?.cleanedUp || 0,
        totalPublished: responseData.data?.published || 0,
        errors: []
      });
      
    } catch (error: any) {
      console.error('Error during daily content generation:', error);
      setResults({
        categoriesProcessed: 0,
        totalGenerated: 0,
        totalMoved: 0,
        totalPublished: 0,
        errors: [error.message || 'Unknown error occurred during daily content generation']
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant={variant}
        color={color}
        onClick={handleOpen}
        fullWidth={fullWidth}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
        disabled={loading}
      >
        {buttonText}
      </Button>
      
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="daily-content-dialog-title"
        aria-describedby="daily-content-dialog-description"
      >
        <DialogTitle id="daily-content-dialog-title">
          Daily Content Generator
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="daily-content-dialog-description">
            This tool will perform the following actions for each category:
            <br />
            1. Generate up to 10 new prompt responses if needed
            <br />
            2. Move 10 published prompt responses to the deleted section
            <br />
            3. Promote 10 random draft prompt responses to published status
          </DialogContentText>
          
          {results ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Results:
              </Typography>
              <Typography variant="body1">
                • Categories processed: {results.categoriesProcessed}
              </Typography>
              <Typography variant="body1">
                • New prompts generated: {results.totalGenerated}
              </Typography>
              <Typography variant="body1">
                • Old prompts moved to deleted: {results.totalMoved}
              </Typography>
              <Typography variant="body1">
                • Draft prompts published: {results.totalPublished}
              </Typography>
              
              {results.errors.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Errors:</Typography>
                  {results.errors.map((error, index) => (
                    <Typography key={index} variant="body2">{error}</Typography>
                  ))}
                </Alert>
              )}
            </Box>
          ) : loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
              <CircularProgress />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Close
          </Button>
          <Button 
            onClick={checkAndGenerateContent}
            color="primary" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {loading ? "Processing..." : "Run Daily Content Check"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DailyContentGenerator;
