import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import type { Category } from '../types';

interface PoolStatsProps {
  category: Category;
}

const PoolStats: React.FC<PoolStatsProps> = ({ category }) => {
  if (!category.pools) {
    return <Typography variant="body2">No pool data</Typography>;
  }
  
  const totalItems = Object.values(category.pools).reduce((sum, count) => sum + (count || 0), 0);
  
  // Build tooltip text
  const tooltipText = `
    Regular: ${category.pools.regular || 0}
    Accepted: ${category.pools.accepted || 0}
    Highly Liked: ${category.pools.highly_liked || 0}
    Disliked: ${category.pools.disliked || 0}
    Premium: ${category.pools.premium || 0}
  `;
  
  return (
    <Tooltip title={tooltipText} arrow>
      <Box>
        <Typography variant="body2" component="span">
          {totalItems} items
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ ml: 1, display: 'inline-block' }}>
          (view details)
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default PoolStats; 