import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  HelpOutline,
  TextSnippet as TextSnippetIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { ChromePicker } from 'react-color';
import { categoryAPI, contentAPI, promptAPI } from '../services/api';
import type { Category } from '../types';
import PoolStats from '../components/PoolStats';

// Simple category icons for display
const getCategoryIcon = (icon: string) => {
  return <span>🏷️</span>;
};

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPoolStats, setShowPoolStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    icon: '',
    color: '#3f51b5',
    prompt: '',
    singlePrompt: '',
    promptType: 'single',
    defaultNumToGenerate: 5,
    priority: 0,
    active: true,
    contentType: 'hack'
  });
  
  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  const [promptViewDialog, setPromptViewDialog] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{category: string, prompt: string}>({category: '', prompt: ''});
  
  const [batchDialog, setBatchDialog] = useState(false);
  const [batchOptions, setBatchOptions] = useState({
    numPerCategory: 5,
    difficulty: 'beginner',
    selectedCategories: [] as string[]
  });
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getAllCategories();
      if (response.data?.categories) {
        // Debug: Check returned categories and their contentType values
        console.log('DEBUG [FETCH_CATEGORIES] Categories received:', 
          response.data.categories.map(cat => ({ 
            id: cat._id, 
            name: cat.name, 
            contentType: cat.contentType 
          }))
        );
        
        setCategories(response.data.categories);
        setShowPoolStats(false);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategoriesWithPoolStats = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getCategoriesWithPoolStats();
      if (response.data?.categories) {
        // Debug: Check returned categories and their contentType values
        console.log('DEBUG [FETCH_CATEGORIES_WITH_POOLS] Categories received:', 
          response.data.categories.map(cat => ({ 
            id: cat._id, 
            name: cat.name, 
            contentType: cat.contentType 
          }))
        );
        
        setCategories(response.data.categories);
        setShowPoolStats(true);
      }
    } catch (err) {
      console.error('Error fetching categories with pool stats:', err);
      setError('Failed to load pool statistics');
      fetchCategories();
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (mode: 'add' | 'edit', category?: Category) => {
    setDialogMode(mode);
    
    if (mode === 'edit' && category) {
      setEditingCategory(category);
      
      // Log the content type from the existing category
      debugContentType('EDIT_DIALOG_OPEN', category.contentType);
      
      setFormData({
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        priority: category.priority,
        active: category.active,
        prompt: category.prompt || '',
        singlePrompt: category.singlePrompt || '',
        promptType: category.promptType || 'single',
        defaultNumToGenerate: category.defaultNumToGenerate || 5,
        // Ensure contentType is explicitly set and prioritized
        contentType: category.contentType || 'hack'
      });
      
      // Verify the state right after setting
      setTimeout(() => {
        debugContentType('EDIT_DIALOG_AFTER_SET', formData.contentType);
      }, 0);
    } else {
      // Reset form for adding
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: '',
        color: '#3f51b5',
        priority: 0,
        active: true,
        prompt: '',
        singlePrompt: '',
        promptType: 'single',
        defaultNumToGenerate: 5,
        contentType: 'hack'
      });
      
      debugContentType('ADD_DIALOG_OPEN', 'hack');
    }
    
    setCategoryDialog(true);
  };
  
  const handleCloseDialog = () => {
    setCategoryDialog(false);
  };
  
  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name) {
      // Log content type changes specifically
      if (name === 'contentType') {
        debugContentType('INPUT_CHANGE', value);
      }
      
      // Convert string 'true'/'false' to boolean for the 'active' field
      if (name === 'active') {
        setFormData({ ...formData, [name]: value === 'true' });
      } else {
        setFormData({ ...formData, [name]: value });
        
        // For contentType specifically, verify it was set correctly
        if (name === 'contentType') {
          setTimeout(() => {
            debugContentType('AFTER_SET_IN_INPUT_CHANGE', formData.contentType);
          }, 0);
        }
      }
    }
  };
  
  const handleColorChange = (color: any) => {
    setFormData({ ...formData, color: color.hex });
  };
  
  useEffect(() => {
    // Keep the legacy 'prompt' field in sync with the single prompt
    if (formData.singlePrompt !== undefined) {
      debugContentType('BEFORE_PROMPT_SYNC', formData.contentType);
      
      setFormData(prev => {
        const result = { 
          ...prev,
          prompt: prev.singlePrompt
        };
        
        debugContentType('DURING_PROMPT_SYNC', result.contentType);
        return result;
      });
      
      // Check if contentType was affected
      setTimeout(() => {
        debugContentType('AFTER_PROMPT_SYNC', formData.contentType);
      }, 0);
    }
  }, [formData.singlePrompt]);
  
  const handleSubmit = async () => {
    try {
      // Form validation and logging
      debugContentType('SUBMIT_START', formData.contentType);
      
      // Ensure formData has all required fields explicitly set
      const finalFormData = {
        ...formData,
        name: formData.name,
        description: formData.description || '',
        icon: formData.icon || '',
        color: formData.color || '#3f51b5',
        active: formData.active !== undefined ? formData.active : true,
        priority: formData.priority !== undefined ? formData.priority : 0,
        promptType: formData.promptType || 'single', 
        defaultNumToGenerate: formData.defaultNumToGenerate || 5,
        // Explicit string assignment for contentType to avoid any type issues
        contentType: (formData.contentType as 'hack' | 'hack2' | 'tip' | 'tip2') || 'hack',
        // Make sure prompt fields are consistent
        prompt: formData.singlePrompt || '',
        singlePrompt: formData.singlePrompt || ''
      };
      
      debugContentType('SUBMIT_FINAL_DATA', finalFormData.contentType);
      console.log('Final form data being sent:', finalFormData);
      
      let result;
      if (dialogMode === 'add') {
        result = await categoryAPI.createCategory(finalFormData);
        debugContentType('API_RESPONSE', result?.data?.category?.contentType);
        
        setSnackbar({
          open: true,
          message: 'Category created successfully',
          severity: 'success',
        });
      } else if (dialogMode === 'edit' && editingCategory?._id) {
        result = await categoryAPI.updateCategory(editingCategory._id, finalFormData);
        debugContentType('API_RESPONSE', result?.data?.category?.contentType);
        
        setSnackbar({
          open: true,
          message: 'Category updated successfully',
          severity: 'success',
        });
      }
      
      // Refresh categories
      showPoolStats ? fetchCategoriesWithPoolStats() : fetchCategories();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving category:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save category',
        severity: 'error',
      });
    }
  };
  
  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryAPI.deleteCategory(id);
        setSnackbar({
          open: true,
          message: 'Category deleted successfully',
          severity: 'success',
        });
        showPoolStats ? fetchCategoriesWithPoolStats() : fetchCategories();
      } catch (err) {
        console.error('Error deleting category:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete category',
          severity: 'error',
        });
      }
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const handleTestPrompt = async (category: Category) => {
    if (!category._id) return;
    
    try {
      const contentTypeDisplay = category.contentType || 'hack';
      if (window.confirm(`Generate ${category.defaultNumToGenerate || 1} ${contentTypeDisplay} content items using "${category.name}" prompt?`)) {
        setSnackbar({
          open: true,
          message: `Generating ${contentTypeDisplay} content for ${category.name}...`,
          severity: 'info',
        });
        
        const response = await contentAPI.generateMultipleContent(
          category._id,
          undefined, // Don't specify contentType - use category's setting
          category.defaultNumToGenerate || 1,
          'beginner'
        );
        
        if (response.data?.content) {
          setSnackbar({
            open: true,
            message: `Generated ${response.data.content.length} ${contentTypeDisplay} content items`,
            severity: 'success',
          });
        } else {
          throw new Error('No content was returned');
        }
      }
    } catch (err) {
      console.error('Error generating content:', err);
      setSnackbar({
        open: true,
        message: 'Failed to generate content',
        severity: 'error',
      });
    }
  };
  
  // Activate all categories function
  const handleActivateAllCategories = async () => {
    if (!window.confirm("This will activate all inactive categories. Continue?")) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await categoryAPI.activateAllCategories();
      const activatedCount = response.data?.activatedCount || 0;
      
      setSnackbar({
        open: true,
        message: activatedCount > 0 
          ? `Activated ${activatedCount} categories successfully` 
          : 'All categories are already active',
        severity: 'success',
      });
      
      // Refresh the categories list
      showPoolStats ? fetchCategoriesWithPoolStats() : fetchCategories();
    } catch (err) {
      console.error('Error activating categories:', err);
      setSnackbar({
        open: true,
        message: 'Failed to activate categories',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Show prompt details
  const handleViewPrompt = (category: Category) => {
    setSelectedPrompt({
      category: category.name,
      prompt: category.prompt || 'No prompt configured for this category'
    });
    setPromptViewDialog(true);
  };
  
  // Add batch generation functions
  const handleOpenBatchDialog = () => {
    // Get only active categories
    const activeCategories = categories.filter(cat => cat.active).map(cat => cat._id || '').filter(id => id !== '');
    
    setBatchOptions({
      numPerCategory: 5,
      difficulty: 'beginner',
      selectedCategories: activeCategories
    });
    setBatchDialog(true);
  };
  
  const handleCloseBatchDialog = () => {
    setBatchDialog(false);
  };
  
  const handleBatchInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name) {
      setBatchOptions({ ...batchOptions, [name]: value });
    }
  };
  
  const handleBatchGenerate = async () => {
    try {
      setLoading(true);
      setBatchDialog(false);
      
      setSnackbar({
        open: true,
        message: `Generating content for ${batchOptions.selectedCategories.length} categories...`,
        severity: 'info',
      });
      
      let successCount = 0;
      let totalGenerated = 0;
      
      for (const categoryId of batchOptions.selectedCategories) {
        try {
          // Find the category object to get its contentType
          const categoryObj = categories.find(c => c._id === categoryId);
          if (!categoryObj) continue;
          
          // No need to pass contentType explicitly - let the backend use the category's type
          const response = await contentAPI.generateMultipleContent(
            categoryId,
            undefined, // Don't pass contentType - let server use category's type
            batchOptions.numPerCategory,
            batchOptions.difficulty
          );
          
          if (response.data?.content) {
            successCount++;
            totalGenerated += response.data.content.length;
          }
        } catch (error) {
          console.error(`Error generating content for category ${categoryId}:`, error);
        }
      }
      
      setSnackbar({
        open: true,
        message: `Generated ${totalGenerated} content items across ${successCount} categories`,
        severity: 'success',
      });
      
      showPoolStats ? fetchCategoriesWithPoolStats() : fetchCategories();
    } catch (err) {
      console.error('Error in batch generation:', err);
      setSnackbar({
        open: true,
        message: 'Error during batch content generation',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add seedPrompts function
  const handleSeedPrompts = async () => {
    if (!window.confirm('This will import prompts from defaultprompts.txt and update all categories. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setSnackbar({
        open: true,
        message: 'Importing prompts from defaultprompts.txt...',
        severity: 'info',
      });
      
      const response = await promptAPI.seedPromptsFromDefaultFile();
      
      // Use optional chaining and default values to handle potential undefined data
      const updatedCategories = response.data?.updatedCategories || 0;
      const newPrompts = response.data?.newPrompts || 0;
      
      setSnackbar({
        open: true,
        message: `Updated ${updatedCategories} categories with ${newPrompts} new prompts`,
        severity: 'success',
      });
      
      // Refresh to see the changes
      fetchCategories();
    } catch (err) {
      console.error('Error seeding prompts:', err);
      setSnackbar({
        open: true, 
        message: 'Failed to import prompts',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Debug function to track contentType
  const debugContentType = (step: string, value: any) => {
    console.log(`DEBUG [${step}] ContentType: ${value}`);
  };
  
  if (loading && categories.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Category Management
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={showPoolStats ? fetchCategoriesWithPoolStats : fetchCategories}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={fetchCategoriesWithPoolStats}
            sx={{ mr: 1 }}
          >
            {showPoolStats ? "Update Pool Stats" : "Show Pool Stats"}
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={handleSeedPrompts}
            sx={{ mr: 1 }}
          >
            Import Prompts
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleOpenBatchDialog}
            sx={{ mr: 1 }}
          >
            Batch Generate
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
          >
            Add Category
          </Button>
        </Box>
      </Box>
      
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" color="text.secondary">
          {categories.filter(c => c.active).length} active / {categories.length} total categories
        </Typography>
        <Button 
          variant="outlined" 
          color="success"
          onClick={handleActivateAllCategories}
          disabled={categories.filter(c => !c.active).length === 0}
        >
          Activate All Categories
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Icon</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Content Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Prompt</TableCell>
                {showPoolStats && <TableCell>Content Pools</TableCell>}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showPoolStats ? 10 : 9} align="center">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow 
                    key={category._id}
                    sx={{
                      bgcolor: category.active ? 'inherit' : '#f9f9f9',
                    }}
                  >
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{getCategoryIcon(category.icon)}</TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>
                      <Box 
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: category.color,
                          border: '1px solid #ddd'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={category.contentType || 'hack'}
                        color={
                          category.contentType === 'hack' ? "primary" :
                          category.contentType === 'hack2' ? "secondary" :
                          category.contentType === 'tip' ? "info" :
                          category.contentType === 'tip2' ? "success" : 
                          "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{category.priority}</TableCell>
                    <TableCell>
                      <Chip 
                        label={category.active ? "Active" : "Inactive"}
                        color={category.active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{category.contentCount || 0}</TableCell>
                    <TableCell>
                      {category.prompt ? (
                        <Tooltip title="View prompt">
                          <IconButton 
                            color="primary"
                            onClick={() => handleViewPrompt(category)}
                            size="small"
                          >
                            <Badge color="success" variant="dot">
                              <TextSnippetIcon />
                            </Badge>
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="No prompt configured">
                          <IconButton 
                            color="default"
                            onClick={() => handleOpenDialog('edit', category)}
                            size="small"
                          >
                            <TextSnippetIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    {showPoolStats && (
                      <TableCell>
                        {category.pools ? (
                          <PoolStats category={category} />
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                    )}
                    <TableCell align="right">
                      {category.prompt && (
                        <Tooltip title={`Generate ${category.contentType || 'hack'} content with this category's prompt`}>
                          <IconButton 
                            color="secondary"
                            onClick={() => handleTestPrompt(category)}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton 
                        color="primary"
                        onClick={() => handleOpenDialog('edit', category)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => category._id && handleDeleteCategory(category._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Category Form Dialog */}
      <Dialog open={categoryDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Category' : 'Edit Category'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              Basic Information
            </Typography>
            
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              required
            />
            
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
            
            <Box display="flex" gap={2} mt={2}>
              <TextField
                label="Icon"
                name="icon"
                value={formData.icon}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                helperText="Icon name (e.g., fitness, dating)"
              />
              
              <TextField
                label="Priority"
                name="priority"
                type="number"
                value={formData.priority}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 0 } }}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  name="active"
                  value={formData.active ? "true" : "false"}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value={"true"}>Active</MenuItem>
                  <MenuItem value={"false"}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => setColorPickerOpen(!colorPickerOpen)}
                sx={{ 
                  bgcolor: formData.color,
                  color: '#fff',
                  '&:hover': {
                    bgcolor: formData.color,
                    opacity: 0.9
                  }
                }}
              >
                {colorPickerOpen ? 'Close Color Picker' : 'Choose Color'}
              </Button>
              
              {colorPickerOpen && (
                <Box mt={2}>
                  <ChromePicker
                    color={formData.color}
                    onChange={handleColorChange}
                    disableAlpha
                  />
                </Box>
              )}
            </Box>
            
            <Typography variant="subtitle1" fontWeight="bold" mt={4} mb={2} pt={2} borderTop="1px solid #eee">
              Content & Prompt Configuration
              <Tooltip title="Define how content is generated for this category">
                <IconButton size="small">
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Box display="flex" gap={2} mt={2}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Content Type</InputLabel>
                <Select
                  name="contentType"
                  value={formData.contentType || 'hack'}
                  onChange={(e) => {
                    const newType = e.target.value;
                    debugContentType('SELECT_CHANGE', newType);
                    setFormData({
                      ...formData,
                      contentType: newType
                    });
                    
                    // Verify the state right after setting
                    setTimeout(() => {
                      debugContentType('SELECT_AFTER_SET', formData.contentType);
                    }, 0);
                  }}
                  label="Content Type"
                >
                  <MenuItem value="hack">
                    <Box display="flex" alignItems="center">
                      <Chip color="primary" size="small" label="hack" sx={{ mr: 1 }} />
                      Hacks (regular)
                    </Box>
                  </MenuItem>
                  <MenuItem value="hack2">
                    <Box display="flex" alignItems="center">
                      <Chip color="secondary" size="small" label="hack2" sx={{ mr: 1 }} />
                      Hacks (advanced)
                    </Box>
                  </MenuItem>
                  <MenuItem value="tip">
                    <Box display="flex" alignItems="center">
                      <Chip color="info" size="small" label="tip" sx={{ mr: 1 }} />
                      Tips (regular)
                    </Box>
                  </MenuItem>
                  <MenuItem value="tip2">
                    <Box display="flex" alignItems="center">
                      <Chip color="success" size="small" label="tip2" sx={{ mr: 1 }} />
                      Tips (advanced)
                    </Box>
                  </MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary">
                  This determines what type of content will be generated for this category
                </Typography>
              </FormControl>
              
              <TextField
                label="Default Number to Generate"
                name="defaultNumToGenerate"
                type="number"
                value={formData.defaultNumToGenerate || 5}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 1, max: 20 } }}
                helperText="How many items to generate by default"
              />
            </Box>
            
            <Typography variant="subtitle2" mt={3} mb={1}>
              Prompt Template
            </Typography>
            <TextField
              label="Generation Prompt"
              name="singlePrompt"
              value={formData.singlePrompt}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              multiline
              rows={6}
              helperText="This prompt will be used to generate content. Use the variable {numToGenerate} to specify how many items to create."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained" 
            color="primary"
            disabled={!formData.name}
          >
            {dialogMode === 'add' ? 'Create Category' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Prompt View Dialog */}
      <Dialog open={promptViewDialog} onClose={() => setPromptViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Prompt for {selectedPrompt.category}
        </DialogTitle>
        <DialogContent dividers>
          <Typography 
            component="pre" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              overflowX: 'auto'
            }}
          >
            {selectedPrompt.prompt}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptViewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Batch Generation Dialog */}
      <Dialog open={batchDialog} onClose={handleCloseBatchDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Batch Generate Content
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Generate content for multiple categories at once. This will create draft content that you can review before publishing.
              Each category will use its own configured content type (hack, tip, etc).
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Difficulty</InputLabel>
              <Select
                name="difficulty"
                value={batchOptions.difficulty}
                onChange={handleBatchInputChange}
                label="Difficulty"
              >
                <MenuItem value={"beginner"}>Beginner (Easy)</MenuItem>
                <MenuItem value={"intermediate"}>Intermediate</MenuItem>
                <MenuItem value={"advanced"}>Advanced</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Items per Category"
              name="numPerCategory"
              type="number"
              value={batchOptions.numPerCategory}
              onChange={handleBatchInputChange}
              fullWidth
              margin="normal"
              InputProps={{ inputProps: { min: 1, max: 20 } }}
              helperText={`Will generate ${batchOptions.numPerCategory * batchOptions.selectedCategories.length} items total`}
            />
            
            <Typography variant="subtitle2" mt={3}>
              Selected Categories: {batchOptions.selectedCategories.length}
            </Typography>
            
            <Box sx={{ 
              mt: 2, 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #eee', 
              borderRadius: 1,
              p: 1
            }}>
              {categories
                .filter(cat => cat.active)
                .map(cat => (
                  <Chip
                    key={cat._id}
                    label={`${cat.name} (${cat.contentType || 'hack'})`}
                    variant={batchOptions.selectedCategories.includes(cat._id || '') ? "filled" : "outlined"}
                    onClick={() => {
                      const selectedCats = [...batchOptions.selectedCategories];
                      const index = selectedCats.indexOf(cat._id || '');
                      if (index === -1) {
                        selectedCats.push(cat._id || '');
                      } else {
                        selectedCats.splice(index, 1);
                      }
                      setBatchOptions({...batchOptions, selectedCategories: selectedCats});
                    }}
                    sx={{ m: 0.5 }}
                    color={batchOptions.selectedCategories.includes(cat._id || '') ? "primary" : "default"}
                  />
                ))
              }
            </Box>
            
            <Typography variant="body2" color="text.secondary" mt={2}>
              Note: Each category will use its own configured content type.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatchDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleBatchGenerate}
            variant="contained" 
            color="primary"
            disabled={batchOptions.selectedCategories.length === 0}
          >
            Generate Content
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default Categories; 