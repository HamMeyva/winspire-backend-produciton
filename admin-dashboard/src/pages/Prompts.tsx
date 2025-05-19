import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const Prompts: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Add a small delay before redirecting
    const timer = setTimeout(() => {
      navigate('/categories', { 
        state: { 
          message: 'Prompts are now managed within each category. Please edit category settings to manage prompts.'
        } 
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="50vh">
      <CircularProgress sx={{ mb: 3 }} />
      <Typography variant="h6">
        Prompts are now managed within each category.
      </Typography>
      <Typography variant="body1">
        Redirecting to the Categories page...
      </Typography>
    </Box>
  );
};

export default Prompts; 