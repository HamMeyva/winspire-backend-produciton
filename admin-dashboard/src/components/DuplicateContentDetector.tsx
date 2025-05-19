import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Paper,
  Stack,
  Grid,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { contentAPI } from '../services/api';

type DuplicateContent = {
  _id: string;
  title: string;
  body: string;
  status: string;
  category: string;
  titleSimilarity: number;
  bodySimilarity: number;
  overallSimilarity: number;
};

type ContentItem = {
  _id: string;
  title: string;
  body: string;
  status: string;
  category: string;
};

const DuplicateContentDetector: React.FC<{
  contentId: string;
  onDuplicateResolved: () => void;
}> = ({ contentId, onDuplicateResolved }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateContent[]>([]);
  const [originalContent, setOriginalContent] = useState<ContentItem | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [comparingContent, setComparingContent] = useState<DuplicateContent | null>(null);

  useEffect(() => {
    if (open && contentId) {
      checkForDuplicates();
      fetchOriginalContent();
    }
  }, [open, contentId]);

  const fetchOriginalContent = async () => {
    try {
      const response = await contentAPI.getContentById(contentId);
      if (response.status === 'success' && response.data.content) {
        setOriginalContent(response.data.content);
      }
    } catch (err) {
      console.error('Error fetching original content:', err);
      setError('Failed to fetch original content details');
    }
  };

  const checkForDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/duplicates/check/${contentId}`);
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setDuplicates(data.data.duplicates);
      } else {
        setError(data.message || 'Failed to check for duplicates');
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err);
      setError('Failed to check for duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDuplicate = async () => {
    if (!selectedContent) {
      setError('Please select which content to keep');
      return;
    }

    setLoading(true);
    try {
      // Get all content IDs involved in the duplicate set
      const allContentIds = [contentId, ...duplicates.map(d => d._id)];
      
      // If keeping original, put it first; otherwise put selected duplicate first
      const sortedContentIds = selectedContent === contentId
        ? allContentIds
        : [selectedContent, ...allContentIds.filter(id => id !== selectedContent)];
      
      const response = await fetch('/api/duplicates/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contentIds: sortedContentIds })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setOpen(false);
        onDuplicateResolved();
      } else {
        setError(data.message || 'Failed to resolve duplicates');
      }
    } catch (err) {
      console.error('Error resolving duplicates:', err);
      setError('Failed to resolve duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setSelectedContent(contentId); // Default to keeping the original
  };

  const handleClose = () => {
    setOpen(false);
    setDuplicates([]);
    setError(null);
    setSelectedContent(null);
    setComparingContent(null);
  };

  const formatSimilarity = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const compareContent = (duplicate: DuplicateContent) => {
    setComparingContent(duplicate);
  };

  return (
    <>
      <Button 
        variant="outlined" 
        color="primary" 
        onClick={handleOpen}
        startIcon={<CompareArrowsIcon />}
      >
        Check for Duplicates
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Duplicate Content Detector
        </DialogTitle>
        
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Original Content
              </Typography>
              
              <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: selectedContent === contentId ? '#e3f2fd' : 'white' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {originalContent?.title}
                  </Typography>
                  <Button 
                    variant={selectedContent === contentId ? "contained" : "outlined"}
                    color="success"
                    onClick={() => setSelectedContent(contentId)}
                    startIcon={<ThumbUpIcon />}
                    size="small"
                  >
                    Keep This
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {originalContent?.body}
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                {duplicates.length} Potential Duplicates Found
              </Typography>
              
              {duplicates.length === 0 ? (
                <Alert severity="info">No duplicate content found!</Alert>
              ) : (
                <List>
                  {duplicates.map((duplicate) => (
                    <React.Fragment key={duplicate._id}>
                      <Paper 
                        elevation={3} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          bgcolor: selectedContent === duplicate._id ? '#e3f2fd' : 'white'
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {duplicate.title}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Button 
                                  variant="outlined"
                                  color="info"
                                  onClick={() => compareContent(duplicate)}
                                  startIcon={<CompareArrowsIcon />}
                                  size="small"
                                >
                                  Compare
                                </Button>
                                <Button 
                                  variant={selectedContent === duplicate._id ? "contained" : "outlined"}
                                  color="success"
                                  onClick={() => setSelectedContent(duplicate._id)}
                                  startIcon={<ThumbUpIcon />}
                                  size="small"
                                >
                                  Keep This
                                </Button>
                              </Stack>
                            </Stack>
                          </Grid>
                          
                          <Grid item xs={12} md={8}>
                            <Typography variant="body2" sx={{ 
                              whiteSpace: 'pre-wrap',
                              maxHeight: '150px',
                              overflow: 'auto'
                            }}>
                              {duplicate.body}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Stack spacing={1}>
                              <Chip 
                                label={`Title Similarity: ${formatSimilarity(duplicate.titleSimilarity)}`}
                                color={duplicate.titleSimilarity > 0.9 ? "error" : "warning"}
                                variant="outlined"
                              />
                              <Chip 
                                label={`Content Similarity: ${formatSimilarity(duplicate.bodySimilarity)}`}
                                color={duplicate.bodySimilarity > 0.8 ? "error" : "warning"}
                                variant="outlined"
                              />
                              <Chip 
                                label={`Overall: ${formatSimilarity(duplicate.overallSimilarity)}`}
                                color={duplicate.overallSimilarity > 0.85 ? "error" : "warning"}
                                variant="outlined"
                              />
                            </Stack>
                          </Grid>
                        </Grid>
                      </Paper>
                    </React.Fragment>
                  ))}
                </List>
              )}

              {comparingContent && (
                <Box sx={{ mt: 4, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Comparison View
                  </Typography>
                  <Paper elevation={3} sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary">Original</Typography>
                        <Typography variant="subtitle1" fontWeight="bold">{originalContent?.title}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                          {originalContent?.body}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="secondary">Duplicate</Typography>
                        <Typography variant="subtitle1" fontWeight="bold">{comparingContent.title}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                          {comparingContent.body}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleResolveDuplicate} 
            color="primary" 
            variant="contained"
            disabled={loading || !selectedContent || duplicates.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Resolve Duplicates'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DuplicateContentDetector;
