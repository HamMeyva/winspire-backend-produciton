import React, { useState, useEffect, useRef } from 'react';
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
  TablePagination,
  Chip,
  CircularProgress,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Switch,
  Checkbox,
  LinearProgress,
  List,
  ListItem,
  ListSubheader
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  MoreVert as MoreIcon,
  AutoFixHigh as GenerateIcon,
  Recycling as RecycleIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  CheckCircle,
  Error,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  AutoFixHigh as AutoFixHighIcon,
  Publish as PublishIcon,
  SmartToy as SmartToyIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { contentAPI, categoryAPI } from '../services/api';
import type { Content, Category } from '../types';
import DuplicateContentDetector from '../components/DuplicateContentDetector';

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ContentManagerProps {}

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
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `content-tab-${index}`,
    'aria-controls': `content-tabpanel-${index}`,
  };
}

const ContentManager: React.FC<ContentManagerProps> = () => {
  // State for content
  const [content, setContent] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for tabs & filters
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [poolFilter, setPoolFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDuplicateFilter, setIsDuplicateFilter] = useState<string>('all');
  
  // State for AI content generation
  const [generationDialog, setGenerationDialog] = useState(false);
  const [generationCategory, setGenerationCategory] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [generationCount, setGenerationCount] = useState(10);
  const [multiCategoryMode, setMultiCategoryMode] = useState(false);
  
  // Add model selection state
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [generationInProgress, setGenerationInProgress] = useState(false);
  
  // Available models grouped by category
  const availableModels = {
    flagship: [
      { id: 'gpt-4.1', name: 'GPT-4.1 (Most Powerful)' },
      { id: 'gpt-4o', name: 'GPT-4o (Fast & Powerful)' },
    ],
    reasoning: [
      { id: 'o3', name: 'o3 (Best for Complex Content)' },
      { id: 'o3-mini', name: 'o3-mini (Efficient Reasoning)' },
    ],
    costEfficient: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini (Fast & Affordable)' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini (Balanced)' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Legacy)' },
    ],
    legacy: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Legacy)' },
    ]
  };
  
  // State for content dialog
  const [contentDialog, setContentDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<Partial<Content>>({
    title: '',
    body: '',
    summary: '',
    category: '',
    tags: [],
    status: 'draft',
    contentType: 'hack',
    difficulty: 'beginner',
    pool: 'regular'
  });
  
  // State for moderation dialog
  const [moderationDialog, setModerationDialog] = useState(false);
  const [moderationNotes, setModerationNotes] = useState('');
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [generationProgress, setGenerationProgress] = useState<{
    total: number;
    completed: number;
    currentCategory: string | null;
    currentItemInCategory: number;
    totalItemsInCategory: number;
    results: Array<{
      categoryId: string;
      categoryName: string;
      success: boolean;
      count: number;
      error?: string;
    }>;
  }>({
    total: 0,
    completed: 0,
    currentCategory: null,
    currentItemInCategory: 0,
    totalItemsInCategory: 0,
    results: []
  });
  
  // State for action menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // State for duplicate management
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [duplicateSets, setDuplicateSets] = useState<{ title: string; items: Content[] }[]>([]);
  const [selectedDuplicateSet, setSelectedDuplicateSet] = useState<number>(0);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);

  // Add batch content deletion
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  
  // Toggle selection of a content item
  const handleToggleContentSelection = (contentId: string) => {
    if (selectedContentIds.includes(contentId)) {
      setSelectedContentIds(prev => prev.filter(id => id !== contentId));
    } else {
      setSelectedContentIds(prev => [...prev, contentId]);
    }
  };
  
  // Delete selected content items
  const handleDeleteSelectedContent = async () => {
    if (selectedContentIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedContentIds.length} selected items?`)) {
      return;
    }
    
    try {
      setLoading(true);
      let deletedCount = 0;
      let errors = [];
      
      // Delete each selected item with individual error handling
      for (const contentId of selectedContentIds) {
        try {
          const response = await contentAPI.deleteContent(contentId);
          if (response.success || response.status === 'success') {
            deletedCount++;
          } else {
            errors.push({ id: contentId, error: response.message });
          }
        } catch (err) {
          console.error(`Error deleting content ID ${contentId}:`, err);
          errors.push({ id: contentId, error: err.message || 'Unknown error' });
        }
      }
      
      // Update local state - remove successfully deleted items
      setContent(prevContent => 
        prevContent.filter(item => !selectedContentIds.includes(item._id || '') || 
          errors.some(e => e.id === item._id))
      );
      
      // Reset selection
      setSelectedContentIds([]);
      
      if (errors.length > 0) {
        setSnackbar({
          open: true,
          message: `Deleted ${deletedCount} items. Failed to delete ${errors.length} items.`,
          severity: 'warning'
        });
        console.error('Deletion errors:', errors);
      } else {
        setSnackbar({
          open: true,
          message: `Successfully deleted ${deletedCount} items`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error in batch delete:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete selected items. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Bulk publish selected content items from draft to published
  const handleBulkPublishContent = async () => {
    if (selectedContentIds.length === 0) return;
    
    // Filter to only include draft status content
    const draftContentIds = selectedContentIds.filter(id => {
      const contentItem = content.find(item => item._id === id);
      return contentItem && contentItem.status === 'draft';
    });
    
    if (draftContentIds.length === 0) {
      setSnackbar({
        open: true,
        message: 'No draft content selected. Only draft items can be published in bulk.',
        severity: 'warning'
      });
      return;
    }
    
    if (!window.confirm(`Are you sure you want to publish ${draftContentIds.length} selected draft items?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await contentAPI.bulkPublishContent(draftContentIds);
      
      if (response.success || response.status === 'success') {
        // Update local state - update status of published items
        setContent(prevContent => 
          prevContent.map(item => {
            if (draftContentIds.includes(item._id || '')) {
              return { ...item, status: 'published', publishDate: new Date(), hasBeenPublished: true };
            }
            return item;
          })
        );
        
        // Reset selection
        setSelectedContentIds([]);
        
        setSnackbar({
          open: true,
          message: `Successfully published ${response.data?.totalUpdated || draftContentIds.length} items`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to publish selected items. Please try again.',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error in bulk publish:', err);
      setSnackbar({
        open: true,
        message: 'Failed to publish selected items. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a ref to track if we've already processed the current content set
  const processedContentRef = useRef<string[]>([]);
  
  // Function to fetch initial data (categories and content)
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch categories first
      const categoriesResponse = await categoryAPI.getAllCategories();
      
      if ((categoriesResponse.success || categoriesResponse.status === 'success') && categoriesResponse.data?.categories) {
        setCategories(categoriesResponse.data.categories);
      } else {
        console.warn('Categories response format unexpected:', categoriesResponse);
      }
      
      // Then fetch content
      try {
        const contentResponse = await contentAPI.getAllContent();
        
        if ((contentResponse.success || contentResponse.status === 'success') && contentResponse.data?.content) {
          setContent(contentResponse.data.content);
        } else {
          console.warn('Content response format unexpected:', contentResponse);
          setContent([]);
        }
      } catch (contentError) {
        console.error('Error fetching content:', contentError);
        setError('Failed to load content. Please check your API connection.');
        setContent([]);
      }
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load data. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch content and categories on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Run duplicate detection whenever content changes
  useEffect(() => {
    if (content.length > 0) {
      // Create a fingerprint of current content to check if we've already processed it
      const contentIds = content.map(item => item._id || '').filter(id => id).sort().join(',');
      
      // Only process if we haven't seen this exact set of content before
      if (!processedContentRef.current.includes(contentIds)) {
        // Store this content set as processed
        processedContentRef.current.push(contentIds);
        
        // Limit the history to avoid memory issues
        if (processedContentRef.current.length > 10) {
          processedContentRef.current.shift();
        }
        
        // Check and update duplicate status in the database
        updateDuplicateStatus(content);
      }
    }
  }, [content]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Reset filters when changing tabs
    setStatusFilter('all');
    setCategoryFilter('all');
    setContentTypeFilter('all');
    setDifficultyFilter('all');
    setPoolFilter('all');
    setSearchTerm('');
    setPage(0);
    
    // Fetch data based on tab
    setTimeout(() => {
      let status: string | undefined;
      
      // Determine which status to filter by based on tab
      switch (newValue) {
        case 1: // Published
          status = 'published';
          break;
        case 2: // Pending
          status = 'pending';
          break;
        case 3: // Drafts
          status = 'draft';
          break;
        case 4: // Rejected
          status = 'rejected';
          break;
        default:
          status = undefined;
      }
      
      // Set status filter and fetch data
      setStatusFilter(status || 'all');
      handleRefresh();
      
      // If switching to Pools tab, fetch pool content
      if (newValue === 5) {
        fetchPoolContent('all');
      }
    }, 0);
  };

  // Handle status filter change
  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as string;
    setStatusFilter(value);
    setPage(0); // Reset to first page
    // Don't refresh immediately - wait for user to click Search button
  };

  // Handle category filter change
  const handleCategoryFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as string;
    setCategoryFilter(value);
    setPage(0); // Reset to first page
    // Don't refresh immediately - wait for user to click Search button
  };

  // Handle content type filter change
  const handleContentTypeFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as string;
    setContentTypeFilter(value);
    setPage(0); // Reset to first page
    // Don't refresh immediately - wait for user to click Search button
  };

  const handleDifficultyFilterChange = (event: any) => {
    setDifficultyFilter(event.target.value);
    // Remove immediate refresh - will be triggered by search button
  };

  const handlePoolFilterChange = (event: any) => {
    setPoolFilter(event.target.value);
    // Remove immediate refresh - will be triggered by search button
  };
  
  const handleIsDuplicateFilterChange = (event: any) => {
    setIsDuplicateFilter(event.target.value);
    // Will be triggered by search button
  };

  // Sütunlara göre sıralama için state'ler
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sütun başlığına tıklandığında sıralama işlemi
  const handleSortByColumn = (field: string) => {
    // Aynı sütuna tıklandığında sıralama yönünü değiştir
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Farklı sütuna tıklandığında yeni sütunu seç ve desc ile başla
      setSortField(field);
      setSortDirection('desc');
    }

    // Yerel içeriği sırala
    const sortedContent = [...content].sort((a, b) => {
      if (field === 'createdAt') {
        const dateA = new Date(a.createdAt || a.formattedCreatedAt || '');
        const dateB = new Date(b.createdAt || b.formattedCreatedAt || '');
        return sortDirection === 'asc' ? 
          dateA.getTime() - dateB.getTime() : 
          dateB.getTime() - dateA.getTime();
      } 
      else if (field === 'category') {
        const catNameA = getCategoryName(a.category).toLowerCase();
        const catNameB = getCategoryName(b.category).toLowerCase();
        return sortDirection === 'asc' ? 
          catNameA.localeCompare(catNameB) : 
          catNameB.localeCompare(catNameA);
      }
      return 0;
    });

    setContent(sortedContent);
  };

  // Add handle search function
  const handleSearch = () => {
    // Debug logging to help diagnose filter issues
    console.log('=== FILTER DEBUG ===');
    console.log('Status:', statusFilter);
    console.log('Category:', categoryFilter);
    console.log('Content Type:', contentTypeFilter);
    console.log('Difficulty:', difficultyFilter);
    console.log('Pool:', poolFilter);
    console.log('Duplicate:', isDuplicateFilter);
    console.log('Search Term:', searchTerm);
    
    setPage(0); // Reset to first page
    handleRefresh();
  };

  // Get filtered content - now applies only to items on current page
  const getFilteredContent = () => {
    // If there's no search term, return all content
    if (!searchTerm) return content;
    
    // If there is a search term, also search in status field along with other fields
    const lowerSearchTerm = searchTerm.toLowerCase();
    return content.filter(item => {
      // Check title, summary, body, tags
      const basicMatch = (
        (item.title?.toLowerCase().includes(lowerSearchTerm)) ||
        (item.summary?.toLowerCase().includes(lowerSearchTerm)) ||
        (item.body?.toLowerCase().includes(lowerSearchTerm)) ||
        (item.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
      
      // Also check status field
      const statusMatch = item.status?.toLowerCase().includes(lowerSearchTerm);
      
      return basicMatch || statusMatch;
    });
  };

  const filteredContent = getFilteredContent();

  // Duplicate detection helper
  const isDuplicate = (contentItem: Content) => {
    // First check if content has been explicitly marked as duplicate in the database
    if (contentItem.isDuplicate === true) {
      return true;
    }
    
    // Fall back to title matching logic for items not explicitly marked
    if (!contentItem.title) return false;
    
    const duplicates = content.filter(item => 
      item._id !== contentItem._id && 
      item.title.toLowerCase() === contentItem.title.toLowerCase()
    );
    
    return duplicates.length > 0;
  };

  // Update duplicate status in database for detected duplicates
  const updateDuplicateStatus = async (contentItems: Content[]) => {
    // Group content by title (case insensitive)
    const titleGroups = new Map<string, Content[]>();
    
    contentItems.forEach(item => {
      if (!item.title) return;
      
      const normalizedTitle = item.title.toLowerCase();
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle)?.push(item);
    });
    
    // Find duplicate groups (more than one item with same title)
    const duplicateGroups = Array.from(titleGroups.values()).filter(group => group.length > 1);
    
    // If no duplicates found, return
    if (duplicateGroups.length === 0) {
      console.log('No duplicates found to update');
      return;
    }
    
    console.log(`Found ${duplicateGroups.length} groups of duplicates to update`);
    
    // Update each duplicate in the database
    for (const group of duplicateGroups) {
      // Skip first item (original), mark others as duplicates
      for (let i = 0; i < group.length; i++) {
        const item = group[i];
        
        // Skip items already marked as duplicates or without an ID
        if (item.isDuplicate === true || !item._id) continue;
        
        try {
          // Mark current item as duplicate
          console.log(`Updating duplicate status for content ID: ${item._id}, title: ${item.title}`);
          await contentAPI.updateContent(item._id, {
            isDuplicate: true
          });
        } catch (error) {
          console.error(`Error updating duplicate status for content ID: ${item._id}:`, error);
        }
      }
    }
    
    console.log('Finished updating duplicate statuses');
  };

  // AI content generation
  const handleOpenGenerationDialog = () => {
    if (categories.length > 0) {
      const defaultCat = categories[0];
      setGenerationCategory(defaultCat._id || '');
      if (defaultCat.promptType === 'multiple' && defaultCat.defaultNumToGenerate) {
        setGenerationCount(defaultCat.defaultNumToGenerate);
      } else {
        setGenerationCount(10);
      }
    } else {
      setGenerationCategory('');
      setGenerationCount(10);
    }
    setMultiCategoryMode(false);
    setSelectedCategories([]);
    setGenerationDialog(true);
  };

  const handleCloseGenerationDialog = () => {
    setGenerationDialog(false);
  };

  const handleGenerateContent = async () => {
    try {
      setGeneratingContent(true);
      setError(null);
      
      // Debug logs
      console.log("=== DEBUG: Starting content generation with workaround ===");
      console.log("Generation count:", generationCount);
      console.log("Multi-category mode:", multiCategoryMode);
      console.log("Selected model:", selectedModel);
      
      // Set the flag that generation is in progress
      localStorage.setItem('windspire-generation-in-progress', 'true');
      
      let categoryIdsParam: string[];
      if (multiCategoryMode) {
        if (selectedCategories.length === 0) {
          setSnackbar({
            open: true,
            message: 'Please select at least one category for multi-category generation.',
            severity: 'error'
          });
          setGeneratingContent(false);
          localStorage.removeItem('windspire-generation-in-progress');
          return;
        }
        categoryIdsParam = selectedCategories;
      } else {
        if (!generationCategory) {
          setSnackbar({
            open: true,
            message: 'Please select a category for single-category generation.',
            severity: 'error'
          });
          setGeneratingContent(false);
          localStorage.removeItem('windspire-generation-in-progress');
          return;
        }
        categoryIdsParam = [generationCategory];
      }

      console.log("Categories to process:", categoryIdsParam);
      
      // Clear existing filters to ensure new content is visible
      setStatusFilter('all');
      setCategoryFilter('all');
      setContentTypeFilter('all');
      setDifficultyFilter('all');
      setPoolFilter('all');
      setSearchTerm('');
      setTabValue(0); // Set to "All Content" tab
      
      // Reset page to 0 to show new content at the top
      setPage(0);
      
      // Calculate total number of items to generate across all categories
      const totalItemsToGenerate = categoryIdsParam.length * generationCount;
      
      // Initialize progress tracking
      setGenerationProgress({
        total: categoryIdsParam.length,
        completed: 0,
        currentCategory: null,
        currentItemInCategory: 0,
        totalItemsInCategory: generationCount,
        results: []
      });

      // Process one category at a time
      const allGeneratedContent: Content[] = [];
      const results: Array<{
        categoryId: string;
        categoryName: string;
        success: boolean;
        count: number;
        error?: string;
      }> = [];

      for (let i = 0; i < categoryIdsParam.length; i++) {
        const categoryId = categoryIdsParam[i];
        const category = categories.find(c => c._id === categoryId);
        if (!category) continue;

        // Update progress
        setGenerationProgress(prev => ({
          ...prev,
          currentCategory: category.name,
          completed: i,
          currentItemInCategory: 0
        }));

        try {
          console.log(`DEBUG: Generating content for ${category.name} using model: ${selectedModel}`);
          console.log(`DEBUG: Requesting ${generationCount} items individually from the API`);
          
          // Track generated content for this category
          const categoryGeneratedContent: Content[] = [];
          
          // Make multiple API calls, one for each item we want to generate
          // This is a workaround since the backend seems to ignore the count parameter
          for (let j = 0; j < generationCount; j++) {
            try {
              // Update item progress
              setGenerationProgress(prev => ({
                ...prev,
                currentItemInCategory: j
              }));
              
              console.log(`DEBUG: Generating item ${j + 1} of ${generationCount} for ${category.name}`);
              
              // Add a substantial delay between API calls to prevent rate limiting
              if (j > 0) {
                // Use a much longer delay to avoid hitting rate limits (2 seconds minimum)
                const delayTime = Math.max(2000, 500 * generationCount);
                console.log(`DEBUG: Adding ${delayTime}ms delay between requests to prevent rate limiting`);
                await delay(delayTime);
              }
              
              // Make API call to generate 1 item
              const response = await contentAPI.generateMultipleContent(
                categoryId,
                undefined, // Let server use category's contentType
                1, // Always request 1 item per call
                'beginner',
                selectedModel
              );
              
              // If we got a valid response, add it to our collection
              if (response?.data?.content && response.data.content.length > 0) {
                console.log(`DEBUG: Successfully generated item ${j + 1}`, response.data.content[0].title);
                categoryGeneratedContent.push(...response.data.content);
                
                // Update progress for this item
                setGenerationProgress(prev => ({
                  ...prev,
                  currentItemInCategory: j + 1
                }));
              } else {
                console.warn(`DEBUG: API returned success but no content for item ${j + 1}`);
              }
            } catch (itemError: any) {
              console.error(`Error generating item ${j + 1} for ${category.name}:`, itemError);
              // Continue with next item even if this one failed
            }
          }
          
          console.log(`DEBUG: Successfully generated ${categoryGeneratedContent.length} items for ${category.name}`);
          
          // Add all items from this category to the total generated content
          allGeneratedContent.push(...categoryGeneratedContent);
          
          // Update progress for this category
          setGenerationProgress(prev => ({
            ...prev,
            currentItemInCategory: generationCount,
            results: [
              ...prev.results,
              {
                categoryId,
                categoryName: category.name,
                success: categoryGeneratedContent.length > 0,
                count: categoryGeneratedContent.length
              }
            ]
          }));
          
          results.push({
            categoryId,
            categoryName: category.name,
            success: categoryGeneratedContent.length > 0,
            count: categoryGeneratedContent.length
          });
        } catch (err: any) {
          console.error(`Error generating content for ${category.name}:`, err);
          results.push({
            categoryId,
            categoryName: category.name,
            success: false,
            count: 0,
            error: err.message || 'Unknown error'
          });
        }
      }

      // Update progress to completion
      setGenerationProgress(prev => ({
        ...prev,
        completed: prev.total,
        currentCategory: null,
        currentItemInCategory: prev.totalItemsInCategory,
        results
      }));

      // Update content state with new content
      if (allGeneratedContent.length > 0) {
        // Prepend new content to the beginning of the list
        setContent(prevContent => [...allGeneratedContent, ...prevContent]);
        
        // Highlight newly added content
        setSnackbar({
          open: true,
          message: `${allGeneratedContent.length} new content items have been added!`,
          severity: 'success'
        });
        
        // Force a refresh
        setTimeout(() => {
          handleRefresh();
        }, 1000);
      }

      // Show summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalGenerated = allGeneratedContent.length;

      setSnackbar({
        open: true,
        message: `Generated ${totalGenerated} items across ${successful} categories. ${failed > 0 ? `Failed: ${failed} categories.` : ''}`,
        severity: failed > 0 ? 'warning' : 'success'
      });

      // Clear the generation in progress flag
      localStorage.removeItem('windspire-generation-in-progress');

      // Close dialog on success, or keep open on error to show details
      if (failed === 0) {
        handleCloseGenerationDialog();
      }
    } catch (err: any) {
      console.error('Error in batch generation:', err);
      
      setError(err.message || 'Error during batch content generation');
      
      setSnackbar({
        open: true,
        message: err.message || 'Error during content generation',
        severity: 'error'
      });

      localStorage.removeItem('windspire-generation-in-progress');
    } finally {
      console.log("=== DEBUG: Generation process complete ===");
      setGeneratingContent(false);
    }
  };

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get category name by id
  const getCategoryName = (categoryId: string | Category | undefined): string => {
    if (!categoryId) return 'Unknown';
    
    if (typeof categoryId !== 'string') {
      return categoryId.name;
    }
    
    const category = categories.find(cat => cat._id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Render status chip
  const renderStatusChip = (status: string) => {
    const statusConfig: {[key: string]: { label: string; color: string }} = {
      draft: { label: 'Draft', color: 'default' },
      pending: { label: 'Pending Review', color: 'warning' },
      published: { label: 'Published', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' }
    };
    
    // Safety check: if status is invalid or not in our config, use 'draft' as fallback
    const validStatus = (status && statusConfig[status]) ? status : 'draft';
    const config = statusConfig[validStatus];
    
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  // Helper to split bullet-pointed content into separate items
  const splitBulletPointContent = (content: Content, maxItems: number = 10): Content[] => {
    console.log("=== DEBUG: Starting content splitting ===");
    console.log("Content to split:", content);
    console.log("Max items requested:", maxItems);
    
    // If the content doesn't have title and body, return as is
    if (!content.body || typeof content.body !== 'string') {
      console.log("DEBUG: Content body missing or not a string, returning as is");
      return [content];
    }
    
    // Extract bullet points from the content body
    const body = content.body;
    
    // Common bullet point patterns: "- ", "• ", "* ", "1. ", numbered items, etc.
    const bulletPointRegex = /(?:^|\n)(?:[-•*]|\d+\.)\s+(.*?)(?=(?:\n[-•*]|\n\d+\.|\n\n|$))/gs;
    const matches = [...body.matchAll(bulletPointRegex)];
    console.log("DEBUG: Bullet point matches found:", matches.length);
    
    // If no bullet points found, try to split by paragraphs
    if (matches.length <= 1) {
      console.log("DEBUG: No bullet points found, trying to split by paragraphs");
      const paragraphs = body.split(/\n\n+/);
      console.log("DEBUG: Paragraphs found:", paragraphs.length);
      
      if (paragraphs.length > 1) {
        return paragraphs.slice(0, maxItems).map((paragraph, index) => {
          // Create new content item for this paragraph
          return {
            ...content,
            _id: undefined, // Remove ID so a new one will be created
            title: `${content.title} - Part ${index + 1}`,
            body: paragraph.trim(),
            summary: paragraph.substring(0, Math.min(paragraph.length, 120)) + (paragraph.length > 120 ? '...' : '')
          };
        });
      }
      
      // If still not splittable, return original content
      console.log("DEBUG: Content not splittable, returning as is");
      return [content];
    }
    
    // Split into multiple content items, one for each bullet point, up to maxItems
    const contentItems: Content[] = [];
    
    // Common title pattern (if the title looks like a list title)
    const titlePattern = /^(.+?)(?:\:|\-|–|—|\.|$)/;
    const titleMatch = content.title.match(titlePattern);
    const baseTitle = titleMatch ? titleMatch[1].trim() : content.title;
    
    // Extract bullet points up to maxItems
    const limitedMatches = matches.slice(0, maxItems);
    console.log("DEBUG: Using limited matches:", limitedMatches.length);
    
    limitedMatches.forEach((match, index) => {
      if (!match[1]) return; // Skip if no content in group
      
      const bulletText = match[1].trim();
      if (bulletText.length < 5) return; // Skip very short bullet points
      
      // Create a title from the bullet point
      const bulletTitle = bulletText.length > 50 
        ? bulletText.substring(0, 47) + '...' 
        : bulletText;
      
      // Format the new title (either use "Title - Point" or just "Point")
      const newTitle = baseTitle.length > 0 && baseTitle.length < 30
        ? `${baseTitle} - ${bulletTitle.charAt(0).toUpperCase() + bulletTitle.slice(1)}`
        : bulletTitle.charAt(0).toUpperCase() + bulletTitle.slice(1);
      
      // Create new content item for this bullet point
      const newContent: Content = {
        ...content,
        _id: undefined, // Remove ID so a new one will be created
        title: newTitle,
        body: bulletText,
        summary: bulletText.substring(0, Math.min(bulletText.length, 120)) + (bulletText.length > 120 ? '...' : '')
      };
      
      contentItems.push(newContent);
    });
    
    console.log("DEBUG: Final number of content items created:", contentItems.length);
    
    // If we successfully extracted bullet points, return them
    // Otherwise return the original content
    return contentItems.length > 0 ? contentItems : [content];
  };

  // Find duplicates across the entire content array
  const findAllDuplicates = () => {
    const titleMap = new Map<string, Content[]>();
    
    // Group by normalized title (lowercase, no punctuation)
    content.forEach(item => {
      const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '');
      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle)?.push(item);
    });
    
    // Filter groups with more than one item (actual duplicates)
    const duplicateGroups: { title: string; items: Content[] }[] = [];
    titleMap.forEach((items, normalizedTitle) => {
      if (items.length > 1) {
        duplicateGroups.push({
          title: items[0].title, // Use the first item's title as the group name
          items
        });
      }
    });
    
    return duplicateGroups;
  };
  
  // Open duplicate management dialog
  const handleOpenDuplicateDialog = () => {
    const duplicates = findAllDuplicates();
    setDuplicateSets(duplicates);
    setSelectedDuplicateSet(0);
    setSelectedDuplicates([]);
    setDuplicateDialog(true);
  };
  
  // Close duplicate management dialog
  const handleCloseDuplicateDialog = () => {
    setDuplicateDialog(false);
  };
  
  // Handle duplicate selection
  const handleDuplicateSelect = (contentId: string) => {
    setSelectedDuplicates(prev => {
      if (prev.includes(contentId)) {
        return prev.filter(id => id !== contentId);
      } else {
        return [...prev, contentId];
      }
    });
  };
  
  // Handle duplicate rewrite
  const handleRewriteDuplicate = async (contentId: string, rewriteModel: string = 'gpt-4o') => {
    try {
      const contentItem = content.find(item => item._id === contentId);
      if (!contentItem) return;
      
      setSnackbar({
        open: true,
        message: 'Rewriting duplicate content...',
        severity: 'info'
      });
      
      // Use the provided model for rewriting
      const response = await contentAPI.rewriteContent(
        contentId,
        rewriteModel
      );
      
      if (response.data?.content) {
        // Update the content in the list
        setContent(prevContent => 
          prevContent.map(item => item._id === contentId ? response.data?.content : item)
        );
        
        setSnackbar({
          open: true,
          message: 'Content successfully rewritten',
          severity: 'success'
        });
        
        // Update duplicate sets
        const remainingDuplicates = findAllDuplicates();
        setDuplicateSets(remainingDuplicates);
      }
    } catch (err) {
      console.error('Error rewriting content:', err);
      setSnackbar({
        open: true,
        message: 'Failed to rewrite content. Please try again.',
        severity: 'error'
      });
    }
  };

  // Delete selected duplicates
  const handleDeleteSelectedDuplicates = async () => {
    if (selectedDuplicates.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedDuplicates.length} duplicate items?`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      let deletedCount = 0;
      let errors = [];
      
      // Delete each selected duplicate with individual error handling
      for (const contentId of selectedDuplicates) {
        try {
          await contentAPI.deleteContent(contentId);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting content ID ${contentId}:`, err);
          errors.push(contentId);
        }
      }
      
      // Update local state - remove successfully deleted items
      setContent(prevContent => 
        prevContent.filter(item => !selectedDuplicates.includes(item._id || '') || errors.includes(item._id || ''))
      );
      
      // Reset selection and update duplicate sets
      setSelectedDuplicates([]);
      const remainingDuplicates = findAllDuplicates();
      setDuplicateSets(remainingDuplicates);
      
      // If we've removed all duplicates in the current set, move to another set or close
      if (remainingDuplicates.length === 0) {
        handleCloseDuplicateDialog();
      } else if (!remainingDuplicates[selectedDuplicateSet]) {
        setSelectedDuplicateSet(0);
      }
      
      if (errors.length > 0) {
        setSnackbar({
          open: true,
          message: `Deleted ${deletedCount} items. Failed to delete ${errors.length} items.`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Deleted ${deletedCount} duplicate items successfully`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error in batch delete:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete duplicates. Please try again.',
        severity: 'error'
      });
    }
  };

  // Before component unmounts or on page refresh, save generation state
  useEffect(() => {
    // Save generation in progress state to localStorage
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (generatingContent) {
        // Save state
        localStorage.setItem('windspire-generation-in-progress', 'true');
        // Ask for confirmation
        e.preventDefault();
        e.returnValue = 'Content generation is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Check if there was an ongoing generation
    const checkPendingGeneration = () => {
      const pendingGeneration = localStorage.getItem('windspire-generation-in-progress');
      if (pendingGeneration === 'true') {
        setGenerationInProgress(true);
        setSnackbar({
          open: true,
          message: 'Content generation was in progress when you left. Check the content list for new items.',
          severity: 'warning'
        });
        // Clear the flag
        localStorage.removeItem('windspire-generation-in-progress');
      }
    };

    // Check on mount
    checkPendingGeneration();

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatingContent]);

  // Function to automatically move duplicated content to deleted section (except for one per group)
  const handleMoveDuplicatesToDeleted = async () => {
    try {
      // Find all duplicates
      const duplicateGroups = findAllDuplicates();
      
      if (duplicateGroups.length === 0) {
        setSnackbar({
          open: true,
          message: 'No duplicate content found.',
          severity: 'info'
        });
        return;
      }
      
      let movedCount = 0;
      let errors = [];
      
      // Process each duplicate group
      for (const group of duplicateGroups) {
        // Skip the first item (keep one), move others to deleted
        for (let i = 1; i < group.items.length; i++) {
          const itemToMove = group.items[i];
          
          // Make sure we have an ID
          if (!itemToMove._id) continue;
          
          try {
            // Ensure "duplicated" tag exists
            let tags = itemToMove.tags || [];
            if (!tags.includes('duplicated')) {
              tags.push('duplicated');
            }
            
            // First update the item to ensure it has the duplicated tag
            await contentAPI.updateContent(itemToMove._id, {
              ...itemToMove,
              tags
            });
            
            // Then move to deleted
            await contentAPI.deleteContent(itemToMove._id);
            movedCount++;
          } catch (err) {
            console.error(`Error moving duplicate ID ${itemToMove._id}:`, err);
            errors.push(itemToMove._id);
          }
        }
      }
      
      // Refresh content list
      await handleRefresh();
      
      // Show result notification
      if (errors.length > 0) {
        setSnackbar({
          open: true,
          message: `Moved ${movedCount} duplicates to deleted. Failed to move ${errors.length} items.`,
          severity: 'warning'
        });
      } else if (movedCount > 0) {
        setSnackbar({
          open: true,
          message: `Successfully moved ${movedCount} duplicates to deleted section.`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'No duplicates were moved.',
          severity: 'info'
        });
      }
    } catch (err) {
      console.error('Error handling duplicates:', err);
      setSnackbar({
        open: true,
        message: 'Failed to process duplicates. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Add pool content state to track content by pool
  const [poolContent, setPoolContent] = useState<Record<string, Content[]>>({
    regular: [],
    accepted: [],
    highly_liked: [],
    disliked: [],
    premium: []
  });
  const [loadingPools, setLoadingPools] = useState(false);
  
  // Fetch content by pool
  const fetchPoolContent = async (pool: string = 'all') => {
    try {
      setLoadingPools(true);
      const response = await contentAPI.getContentByPool(pool);
      
      if (response.data?.content) {
        // If fetching all pools at once
        if (pool === 'all') {
          // Group content by pool
          const grouped = response.data.content.reduce<Record<string, Content[]>>((acc, item) => {
            const poolName = item.pool || 'regular';
            if (!acc[poolName]) acc[poolName] = [];
            acc[poolName].push(item);
            return acc;
          }, {
            regular: [],
            accepted: [],
            highly_liked: [],
            disliked: [],
            premium: []
          });
          
          setPoolContent(grouped);
        } else {
          // If fetching a specific pool, update just that property
          setPoolContent(prev => ({
            ...prev,
            [pool]: response.data?.content || []
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching pool content:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load content pools',
        severity: 'error'
      });
    } finally {
      setLoadingPools(false);
    }
  };
  
  // Initial fetch of pool content 
  useEffect(() => {
    if (tabValue === 5) { // Only fetch when user selects Pools tab
      fetchPoolContent('all');
    }
  }, [tabValue]);

  // Unified function to fetch content with pagination
  const fetchContentWithPagination = (pageNum: number, rowsPerPageNum: number) => {
    setLoading(true);
    const status = statusFilter !== 'all' ? statusFilter : undefined;
    const category = categoryFilter !== 'all' ? categoryFilter : undefined;
    const contentType = contentTypeFilter !== 'all' ? contentTypeFilter : undefined;
    const difficulty = difficultyFilter !== 'all' ? difficultyFilter : undefined;
    const pool = poolFilter !== 'all' ? poolFilter : undefined;
    const search = searchTerm || undefined;
    // Convert string filter to proper boolean value for API
    let isDuplicateBoolean: boolean | undefined = undefined;
    if (isDuplicateFilter !== 'all') {
      isDuplicateBoolean = isDuplicateFilter === 'true';
    }
    
    // Convert to zero-based index for API
    const apiPage = pageNum + 1;
    
    console.log('Fetching content with params:', {
      page: apiPage,
      limit: rowsPerPageNum,
      status,
      category,
      contentType,
      difficulty,
      pool,
      search,
      isDuplicate: isDuplicateBoolean
    });
    
    contentAPI.getAllContent(
      apiPage,
      rowsPerPageNum,
      status,
      contentType,
      difficulty,
      pool,
      search,
      category,
      isDuplicateBoolean
    )
      .then(response => {
        if (response?.data?.content) {
          setContent(response.data.content);
          
          // Update duplicate status in the database for detected duplicates
          updateDuplicateStatus(response.data.content);
          
          // If we have pagination info, update it
          if (response.data.pagination) {
            setTotalCount(response.data.pagination.total || 0);
            setTotalPages(response.data.pagination.pages || 1);
          }
        } else {
          console.error('Invalid API response format:', response);
        }
      })
      .catch(err => {
        console.error('Error fetching content:', err);
        setError('Error fetching content. Please refresh and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Handle cleanup of duplicate content
  const handleCleanupDuplicates = async () => {
    if (!window.confirm('This will keep one item from each duplicate group and move the rest to deleted with reason "duplicate". Proceed?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await contentAPI.cleanupDuplicateContent();
      
      if (response.success || response.status === 'success') {
        setSnackbar({
          open: true,
          message: `Duplicate cleanup complete: kept ${response.data?.keptCount || 0}, deleted ${response.data?.deletedCount || 0} items`,
          severity: 'success'
        });
        
        // Refresh content list to reflect changes
        fetchContentWithPagination(page, rowsPerPage);
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Failed to clean up duplicates',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error during duplicate cleanup:', error);
      setSnackbar({
        open: true,
        message: 'Error during duplicate cleanup',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Content management functions
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Debug API call parameters
      console.log('=== API CALL PARAMETERS ===');
      console.log('Page:', page + 1); // API uses 1-indexed pages
      console.log('Rows per page:', rowsPerPage);
      console.log('Status filter:', statusFilter);
      console.log('Category filter:', categoryFilter);
      console.log('Content Type filter:', contentTypeFilter);
      console.log('Difficulty filter:', difficultyFilter);
      console.log('Pool filter:', poolFilter);
      console.log('Duplicate filter:', isDuplicateFilter);
      console.log('Search term:', searchTerm);
      
      // Use the unified function
      fetchContentWithPagination(page, rowsPerPage);
    } catch (error: any) {
      console.error('Error refreshing content:', error);
      setError(error.message || 'Unknown error');
      setLoading(false);
    }
  };
  
  // Render loading state
  if (loading && content.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(`Changing to page ${newPage}`); 
    setPage(newPage);
    
    // Call API with updated page immediately
    fetchContentWithPagination(newPage, rowsPerPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    console.log(`Changing rows per page to ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Reset to first page when changing rows per page
    
    // Call API with updated limit immediately
    fetchContentWithPagination(0, newRowsPerPage);
  };

  // Dialog handlers
  const handleOpenContentDialog = (mode: 'add' | 'edit' | 'view', contentItem?: Content) => {
    setDialogMode(mode);
    
    if (mode === 'add') {
      setSelectedContent(null);
      setFormData({
        title: '',
        body: '',
        summary: '',
        category: '',
        tags: [],
        status: 'draft',
        contentType: 'hack',
        difficulty: 'beginner',
        pool: 'regular'
      });
    } else if (contentItem) {
      setSelectedContent(contentItem);
      setFormData({
        title: contentItem.title,
        body: contentItem.body,
        summary: contentItem.summary,
        category: typeof contentItem.category === 'string' 
          ? contentItem.category 
          : contentItem.category?._id || '',
        tags: contentItem.tags,
        status: contentItem.status,
        contentType: contentItem.contentType || 'hack',
        difficulty: contentItem.difficulty,
        pool: contentItem.pool || 'regular'
      });
    }
    
    setContentDialog(true);
  };

  const handleCloseContentDialog = () => {
    setContentDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    setFormData({
      ...formData,
      tags: tagsArray
    });
  };

  // Content submission
  const handleSubmitContent = async () => {
    try {
      if (!formData.category) {
        setSnackbar({
          open: true,
          message: 'Please select a category',
          severity: 'error'
        });
        return;
      }
      
      if (dialogMode === 'add') {
        const response = await contentAPI.createContent(formData);
        
        if (response.success || response.status === 'success') {
          if (response.data?.content) {
            setContent([response.data.content, ...content]);
            setSnackbar({
              open: true,
              message: 'Content created successfully!',
              severity: 'success'
            });
            handleCloseContentDialog();
          }
        } else {
          setSnackbar({
            open: true,
            message: response.message || 'Failed to create content. Please try again.',
            severity: 'error'
          });
        }
      } else if (dialogMode === 'edit' && selectedContent?._id) {
        const response = await contentAPI.updateContent(
          selectedContent._id,
          formData
        );
        
        if (response.data?.content) {
          setContent(
            content.map(item => 
              item._id === selectedContent._id ? response.data.content : item
            )
          );
          setSnackbar({
            open: true,
            message: 'Content updated successfully!',
            severity: 'success'
          });
          handleCloseContentDialog();
        }
      }
    } catch (err) {
      console.error('Error saving content:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${dialogMode === 'add' ? 'create' : 'update'} content. Please try again.`,
        severity: 'error'
      });
    }
  };

  // Content action menu
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, contentId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveContentId(contentId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setActiveContentId(null);
  };

  // Content actions
  const handleDeleteContent = async (contentId: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await contentAPI.deleteContent(contentId);
        
        // Remove from state
        setContent(content.filter(item => item._id !== contentId));
        
        setSnackbar({
          open: true,
          message: 'Content deleted successfully!',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error deleting content:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete content. Please try again.',
          severity: 'error'
        });
      }
    }
    handleCloseMenu();
  };

  // Open moderation dialog
  const handleOpenModerationDialog = (contentItem: Content) => {
    setSelectedContent(contentItem);
    setModerationNotes(contentItem.moderationNotes || '');
    setModerationDialog(true);
    handleCloseMenu();
  };

  const handleCloseModerationDialog = () => {
    setModerationDialog(false);
  };

  // Handle content moderation
  const handleModerateContent = async (action: 'approve' | 'reject') => {
    if (!selectedContent?._id) return;
    
    try {
      const response = await contentAPI.moderateContent(
        selectedContent._id,
        action,
        moderationNotes
      );
      
      if (response.data?.content) {
        setContent(
          content.map(item => 
            item._id === selectedContent._id ? response.data.content : item
          )
        );
        
        setSnackbar({
          open: true,
          message: `Content ${action === 'approve' ? 'approved' : 'rejected'} successfully!`,
          severity: 'success'
        });
      }
      
      handleCloseModerationDialog();
    } catch (err) {
      console.error('Error moderating content:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${action} content. Please try again.`,
        severity: 'error'
      });
    }
  };
  
  // Quick moderation without dialog
  const handleQuickModeration = async (contentId: string, action: 'approve' | 'reject') => {
    try {
      const response = await contentAPI.moderateContent(
        contentId,
        action,
        `Quick ${action} via table action`
      );
      
      if (response.data?.content) {
        // Update content in the state
        setContent(
          content.map(item => 
            item._id === contentId ? response.data.content : item
          )
        );
        
        setSnackbar({
          open: true,
          message: `Content ${action === 'approve' ? 'approved' : 'rejected'}`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error with quick moderation:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${action} content. Please try again.`,
        severity: 'error'
      });
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Content Management
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenContentDialog('add')}
          >
            Add Content
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<GenerateIcon />}
            onClick={handleOpenGenerationDialog}
          >
            Generate Content
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteSelectedContent}
            disabled={selectedContentIds.length === 0}
          >
            Delete Selected
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<PublishIcon />}
            onClick={handleBulkPublishContent}
            disabled={selectedContentIds.length === 0}
          >
            Publish Selected
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ContentCopyIcon />}
            onClick={handleCleanupDuplicates}
          >
            Clean Duplicates
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid xs={12} md={3} item>
            <TextField
              placeholder="Search by title..."
              fullWidth
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          
          <Grid xs={12} md={9} item>
            <Box display="flex" gap={2}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value)}
                  label="Content Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="hack">Hacks</MenuItem>
                  <MenuItem value="tip">Tips</MenuItem>
                  <MenuItem value="hack2">Hacks 2</MenuItem>
                  <MenuItem value="tip2">Tips 2</MenuItem>
                  <MenuItem value="quote">Quotes</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  label="Difficulty"
                >
                  <MenuItem value="all">All Difficulties</MenuItem>
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Pool</InputLabel>
                <Select
                  value={poolFilter}
                  onChange={(e) => setPoolFilter(e.target.value)}
                  label="Pool"
                >
                  <MenuItem value="all">All Pools</MenuItem>
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="highly_liked">Highly Liked</MenuItem>
                  <MenuItem value="disliked">Disliked</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Duplicates</InputLabel>
                <Select
                  value={isDuplicateFilter}
                  onChange={(e) => setIsDuplicateFilter(e.target.value)}
                  label="Duplicates"
                >
                  <MenuItem value="all">All Content</MenuItem>
                  <MenuItem value="true">Duplicates Only</MenuItem>
                  <MenuItem value="false">Non-Duplicates Only</MenuItem>
                </Select>
              </FormControl>

              {/* Add Search Button */}
              <Button 
                variant="contained"
                color="primary"
                onClick={() => {
                  setPage(0); // Reset to first page when searching
                  fetchContentWithPagination(0, rowsPerPage);
                }}
                startIcon={<SearchIcon />}
                sx={{ ml: 2, height: 56, minWidth: 120 }}
              >
                Search
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Paper elevation={1} sx={{ position: 'relative' }}>
        <TableContainer sx={{ maxHeight: '70vh' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedContentIds.length === filteredContent.length}
                    indeterminate={selectedContentIds.length > 0 && selectedContentIds.length < filteredContent.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContentIds(filteredContent.map(item => item._id || ''));
                      } else {
                        setSelectedContentIds([]);
                      }
                    }}
                    color="primary"
                  />
                </TableCell>
                <TableCell>Title</TableCell>
                <TableCell 
                  onClick={() => handleSortByColumn('category')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    fontWeight: sortField === 'category' ? 'bold' : 'normal',
                  }}
                >
                  Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Pool</TableCell>
                <TableCell>Difficulty</TableCell>
                <TableCell>Status</TableCell>
                <TableCell 
                  onClick={() => handleSortByColumn('createdAt')}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    fontWeight: sortField === 'createdAt' ? 'bold' : 'normal',
                  }}
                >
                  Created At {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell>Views</TableCell>
                <TableCell 
                  onClick={async () => {
                    // Show loading indicator
                    setLoading(true);
                    
                    try {
                      // Fetch ALL content without pagination to get everything
                      const response = await contentAPI.getAllContent(
                        1, // Start at page 1
                        1000, // Get a large number of items (effectively all)
                        statusFilter !== 'all' ? statusFilter : undefined,
                        contentTypeFilter !== 'all' ? contentTypeFilter : undefined,
                        difficultyFilter !== 'all' ? difficultyFilter : undefined,
                        poolFilter !== 'all' ? poolFilter : undefined,
                        searchTerm || undefined,
                        categoryFilter !== 'all' ? categoryFilter : undefined
                      );
                      
                      if (response?.data?.content) {
                        // Sort by most likes first
                        const sortedContent = [...response.data.content].sort((a, b) => {
                          const aLikes = a.ratings?.likes || 0;
                          const bLikes = b.ratings?.likes || 0;
                          return bLikes - aLikes; // Sort in descending order (most likes first)
                        });
                        
                        // Update the content state with sorted data
                        setContent(sortedContent);
                        
                        // Reset to first page to show highest liked content
                        setPage(0);
                        
                        // If we have pagination info, update it
                        if (response.data.pagination) {
                          setTotalCount(response.data.pagination.total || 0);
                          setTotalPages(response.data.pagination.pages || 1);
                        }
                        
                        // Show success notification
                        setSnackbar({
                          open: true,
                          message: 'Content sorted by most likes',
                          severity: 'success'
                        });
                      }
                    } catch (error) {
                      console.error('Error fetching content for sorting:', error);
                      setSnackbar({
                        open: true,
                        message: 'Error sorting content. Please try again.',
                        severity: 'error'
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      textDecoration: 'underline' 
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  Likes/Dislikes <ThumbUpIcon fontSize="small" />
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Not slicing anymore since the API already returns paginated content */}
              {filteredContent.map((contentItem) => (
                <TableRow key={contentItem._id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedContentIds.includes(contentItem._id || '')}
                      onChange={() => handleToggleContentSelection(contentItem._id || '')}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => handleOpenContentDialog('view', contentItem)}
                    >
                      {contentItem.title}
                      {isDuplicate(contentItem) && (
                        <Chip
                          label="Duplicate"
                          size="small"
                          color="warning"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {contentItem.summary.length > 60
                        ? `${contentItem.summary.substring(0, 60)}...` 
                        : contentItem.summary}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ID: {contentItem._id ? contentItem._id.substring(0, 8) + '...' : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getCategoryName(contentItem.category)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={contentItem.contentType || 'Hack'} 
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={contentItem.pool || 'Regular'} 
                      color={
                        contentItem.pool === 'highly_liked' 
                          ? 'success' 
                          : contentItem.pool === 'accepted' 
                            ? 'primary' 
                            : contentItem.pool === 'disliked'
                              ? 'error'
                              : contentItem.pool === 'premium'
                                ? 'secondary'
                                : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={contentItem.difficulty.charAt(0).toUpperCase() + contentItem.difficulty.slice(1)} 
                      color={
                        contentItem.difficulty === 'beginner' 
                          ? 'success' 
                          : contentItem.difficulty === 'intermediate' 
                            ? 'warning' 
                            : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{renderStatusChip(contentItem.status)}</TableCell>
                  <TableCell>
                    {contentItem.createdAt ? new Date(contentItem.createdAt).toLocaleString() : contentItem.formattedCreatedAt || 'N/A'}
                  </TableCell>
                  <TableCell>{contentItem.views}</TableCell>
                  <TableCell>
                    {contentItem.actionSummary || (contentItem.ratings ? `${contentItem.ratings.likes} / ${contentItem.ratings.dislikes} / 0` : '0/0/0')}
                  </TableCell>
                  <TableCell align="right">
                    {/* Quick moderation buttons for pending content */}
                    {contentItem.status === 'pending' && (
                      <>
                        <Tooltip title="Quick Approve">
                          <IconButton
                            onClick={() => handleQuickModeration(contentItem._id, 'approve')}
                            color="success"
                            size="small"
                            sx={{ mr: 0.5 }}
                          >
                            <ThumbUpIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Quick Reject">
                          <IconButton
                            onClick={() => handleQuickModeration(contentItem._id, 'reject')}
                            color="error"
                            size="small"
                            sx={{ mr: 0.5 }}
                          >
                            <ThumbDownIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="View">
                      <IconButton 
                        onClick={() => handleOpenContentDialog('view', contentItem)}
                        color="default"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        onClick={() => handleOpenContentDialog('edit', contentItem)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More Actions">
                      <IconButton
                        onClick={(e) => handleOpenMenu(e, contentItem._id)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredContent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No content found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalCount > 0 ? totalCount : 100} // Minimum 100 göster, böylece ileri butonu aktif olur
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} of ${count !== -1 ? count : 'more than ' + to}`
          }
          nextIconButtonProps={{ disabled: false }} // Her zaman aktif
          backIconButtonProps={{ disabled: page === 0 }} // Sadece ilk sayfada pasif
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem 
          onClick={() => {
            if (activeContentId) {
              const contentItem = content.find(item => item._id === activeContentId);
              if (contentItem) {
                handleOpenModerationDialog(contentItem);
              }
            }
          }}
        >
          <ListItemIcon>
            {activeContentId && content.find(item => item._id === activeContentId)?.status === 'pending' ? (
              <ApproveIcon color="success" />
            ) : (
              <ApproveIcon />
            )}
          </ListItemIcon>
          <ListItemText>Moderate</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (activeContentId) {
              handleDeleteContent(activeContentId);
            }
          }}
        >
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Content Dialog */}
      <Dialog open={contentDialog} onClose={handleCloseContentDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' 
            ? 'Add New Content' 
            : dialogMode === 'edit' 
              ? 'Edit Content' 
              : 'View Content'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12} item>
              <TextField
                name="title"
                label="Title"
                value={formData.title}
                onChange={handleInputChange}
                fullWidth
                required
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid xs={12} md={6} item>
              <FormControl fullWidth margin="dense">
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  label="Category"
                  required
                  disabled={dialogMode === 'view'}
                >
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={6} item>
              <FormControl fullWidth margin="dense">
                <InputLabel>Content Type</InputLabel>
                <Select
                  name="contentType"
                  value={formData.contentType || 'hack'}
                  onChange={handleInputChange}
                  label="Content Type"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="hack">Hack</MenuItem>
                  <MenuItem value="tip">Tip</MenuItem>
                  <MenuItem value="hack2">Hack 2</MenuItem>
                  <MenuItem value="tip2">Tip 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={6} item>
              <FormControl fullWidth margin="dense">
                <InputLabel>Difficulty</InputLabel>
                <Select
                  name="difficulty"
                  value={formData.difficulty || 'beginner'}
                  onChange={handleInputChange}
                  label="Difficulty"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={6} item>
              <FormControl fullWidth margin="dense">
                <InputLabel>Pool</InputLabel>
                <Select
                  name="pool"
                  value={formData.pool || 'regular'}
                  onChange={handleInputChange}
                  label="Pool"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="highly_liked">Highly Liked</MenuItem>
                  <MenuItem value="disliked">Disliked</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} item>
              <TextField
                name="summary"
                label="Summary"
                value={formData.summary}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid xs={12} item>
              <TextField
                name="body"
                label="Content"
                value={formData.body}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={10}
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid xs={12} item>
              <TextField
                name="tags"
                label="Tags (comma separated)"
                value={formData.tags?.join(', ')}
                onChange={handleTagsChange}
                fullWidth
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            {dialogMode !== 'add' && (
              <Grid xs={12} md={6} item>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="Status"
                    disabled={dialogMode === 'view'}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <Box>
              {/* Show duplicate detector only in view mode and when content has an ID */}
              {dialogMode === 'view' && selectedContent?._id && (
                <DuplicateContentDetector 
                  contentId={selectedContent._id} 
                  onDuplicateResolved={handleRefresh} 
                />
              )}
            </Box>
            <Box>
              <Button onClick={handleCloseContentDialog} sx={{ ml: 1 }}>
                {dialogMode === 'view' ? 'Close' : 'Cancel'}
              </Button>
              {dialogMode !== 'view' && (
                <Button 
                  onClick={handleSubmitContent} 
                  variant="contained" 
                  disabled={!formData.title || !formData.body || !formData.category}
                  sx={{ ml: 1 }}
                >
                  {dialogMode === 'add' ? 'Create' : 'Update'}
                </Button>
              )}
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Moderation Dialog */}
      <Dialog open={moderationDialog} onClose={handleCloseModerationDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Moderate Content</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedContent?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedContent?.summary}
            </Typography>
          </Box>
          <TextField
            label="Moderation Notes"
            multiline
            rows={4}
            value={moderationNotes}
            onChange={(e) => setModerationNotes(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModerationDialog}>Cancel</Button>
          <Button 
            onClick={() => handleModerateContent('reject')} 
            variant="outlined" 
            color="error"
          >
            Reject
          </Button>
          <Button 
            onClick={() => handleModerateContent('approve')} 
            variant="contained" 
            color="success"
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Content Generation Dialog */}
      <Dialog open={generationDialog} onClose={handleCloseGenerationDialog} maxWidth="md" fullWidth>
        <DialogTitle>Generate AI Content</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Use AI to generate new content items. Select a category and how many items to generate.
              Each category will use its own content type.
            </Typography>
            {generationInProgress && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                A previous generation might still be in progress. Please check the content list for new items.
              </Alert>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={multiCategoryMode}
                    onChange={(e) => setMultiCategoryMode(e.target.checked)}
                  />
                }
                label="Generate for multiple categories"
              />
            </Grid>
            
            {multiCategoryMode ? (
              <Grid item xs={12}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Categories</InputLabel>
                  <Select
                    multiple
                    value={selectedCategories}
                    onChange={(e) => {
                      const value = e.target.value as string[];
                      setSelectedCategories(value);
                    }}
                    label="Categories"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((categoryId) => {
                          const category = categories.find(c => c._id === categoryId);
                          return (
                            <Chip 
                              key={categoryId} 
                              label={`${getCategoryName(categoryId)} (${category?.contentType || 'hack'})`} 
                              size="small" 
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        <ListItemIcon>
                          <Checkbox checked={selectedCategories.indexOf(category._id) > -1} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <span>
                              {category.name} 
                              <Chip 
                                label={category.contentType || 'hack'} 
                                size="small" 
                                sx={{ ml: 1 }}
                                color={
                                  category.contentType === 'hack' ? "primary" :
                                  category.contentType === 'hack2' ? "secondary" :
                                  category.contentType === 'tip' ? "info" :
                                  category.contentType === 'tip2' ? "success" : 
                                  "default"
                                }
                              />
                            </span>
                          } 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={generationCategory}
                    onChange={(e) => setGenerationCategory(e.target.value as string)}
                    label="Category"
                    required
                  >
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.name}
                        <Chip 
                          label={category.contentType || 'hack'} 
                          size="small" 
                          sx={{ ml: 1 }}
                          color={
                            category.contentType === 'hack' ? "primary" :
                            category.contentType === 'hack2' ? "secondary" :
                            category.contentType === 'tip' ? "info" :
                            category.contentType === 'tip2' ? "success" : 
                            "default"
                          }
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Number of Items to Generate"
                type="number"
                value={generationCount}
                onChange={(e) => setGenerationCount(Math.max(1, Math.min(50, parseInt(e.target.value || "1"))))}
                fullWidth
                margin="dense"
                InputProps={{ inputProps: { min: 1, max: 50 } }}
                helperText={multiCategoryMode 
                  ? "Generate this number of items per selected category (max 50 per category)"
                  : "Generate between 1 and 50 items at once"
                }
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>AI Model</InputLabel>
                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  label="AI Model"
                >
                  <ListSubheader>Flagship Models</ListSubheader>
                  {availableModels.flagship.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                  
                  <ListSubheader>Reasoning Models</ListSubheader>
                  {availableModels.reasoning.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                  
                  <ListSubheader>Cost-Efficient Models</ListSubheader>
                  {availableModels.costEfficient.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                  
                  <ListSubheader>Legacy Models</ListSubheader>
                  {availableModels.legacy.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Content Generation Summary:
                </Typography>
                <Typography variant="body2">
                  {multiCategoryMode 
                    ? `Generating ${generationCount} items for each of the ${selectedCategories.length} selected categories (${generationCount * selectedCategories.length} total)`
                    : `Generating ${generationCount} items for ${getCategoryName(generationCategory)}`
                  }
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Using model: <Chip color="primary" size="small" label={selectedModel} />
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Note: Each category will use its own configured content type. 
                  Please don't refresh the page during generation - it may cause issues.
                </Typography>
              </Box>
            </Grid>

            {/* Progress section - show when generating */}
            {generatingContent && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Generation Progress
                  </Typography>
                  
                  {/* Overall progress bar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0} 
                        color="secondary"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {generationProgress.total > 0 ? `${Math.round((generationProgress.completed / generationProgress.total) * 100)}%` : '0%'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Current category progress - more detailed */}
                  {generationProgress.currentCategory && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Currently generating:
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {generationProgress.currentCategory}
                        <Chip 
                          size="small" 
                          label={`Category ${generationProgress.completed + 1} of ${generationProgress.total}`} 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      
                      {/* Item progress within category */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={generationProgress.totalItemsInCategory > 0 
                              ? (generationProgress.currentItemInCategory / generationProgress.totalItemsInCategory) * 100 
                              : 0
                            } 
                            color="info"
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 50 }}>
                          <Typography variant="body2" color="text.secondary">
                            {generationProgress.currentItemInCategory} / {generationProgress.totalItemsInCategory} items
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Results list */}
                  {generationProgress.results.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Completed categories:
                      </Typography>
                      <List dense sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 1 }}>
                        {generationProgress.results.map((result, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              {result.success 
                                ? <CheckCircle color="success" /> 
                                : <Error color="error" />
                              }
                            </ListItemIcon>
                            <ListItemText 
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="body2" fontWeight="medium">{result.categoryName}</Typography>
                                  <Chip 
                                    size="small" 
                                    label={`${result.count} items`} 
                                    color={result.success ? "success" : "error"}
                                    sx={{ ml: 1 }}
                                  />
                                </Box>
                              }
                              secondary={
                                result.success 
                                  ? `Generated ${result.count} items successfully` 
                                  : `Failed: ${result.error || 'Unknown error'}`
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGenerationDialog}>Cancel</Button>
          <Button 
            onClick={handleGenerateContent} 
            variant="contained" 
            color="secondary"
            disabled={generatingContent || (multiCategoryMode ? selectedCategories.length === 0 : !generationCategory)}
            startIcon={generatingContent ? <CircularProgress size={20} /> : <GenerateIcon />}
          >
            {generatingContent ? 'Generating...' : 'Generate Content'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Management Dialog */}
      <Dialog
        open={duplicateDialog}
        onClose={handleCloseDuplicateDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Manage Duplicate Content
          {duplicateSets.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Found {duplicateSets.length} sets of duplicates ({duplicateSets.reduce((total, set) => total + set.items.length, 0)} total items)
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {duplicateSets.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No duplicate content found!</Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Tabs
                  value={selectedDuplicateSet}
                  onChange={(e, newValue) => {
                    setSelectedDuplicateSet(newValue);
                    setSelectedDuplicates([]);
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ flexGrow: 1 }}
                >
                  {duplicateSets.map((set, index) => (
                    <Tab 
                      key={index} 
                      label={`Group ${index + 1} (${set.items.length} items)`} 
                      {...a11yProps(index)} 
                    />
                  ))}
                </Tabs>
              </Box>
              
              {duplicateSets.length > selectedDuplicateSet && (
                <Box>
                  <Paper sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Duplicate Group: "{duplicateSets[selectedDuplicateSet].title}"
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You can delete duplicates, or rewrite them to make them unique. Rewriting preserves the same information but creates unique wording.
                    </Typography>
                    
                    {/* Add model selection for rewriting */}
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" mr={2}>
                        Rewrite model:
                      </Typography>
                      <FormControl size="small" sx={{ width: 200 }}>
                        <Select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          size="small"
                        >
                          <ListSubheader>Flagship Models</ListSubheader>
                          {availableModels.flagship.map(model => (
                            <MenuItem key={model.id} value={model.id}>
                              {model.name}
                            </MenuItem>
                          ))}
                          
                          <ListSubheader>Reasoning Models</ListSubheader>
                          {availableModels.reasoning.map(model => (
                            <MenuItem key={model.id} value={model.id}>
                              {model.name}
                            </MenuItem>
                          ))}
                          
                          <ListSubheader>Cost-Efficient Models</ListSubheader>
                          {availableModels.costEfficient.map(model => (
                            <MenuItem key={model.id} value={model.id}>
                              {model.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>
                  
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox 
                              checked={selectedDuplicates.length === duplicateSets[selectedDuplicateSet].items.length}
                              indeterminate={selectedDuplicates.length > 0 && selectedDuplicates.length < duplicateSets[selectedDuplicateSet].items.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDuplicates(duplicateSets[selectedDuplicateSet].items.map(item => item._id || '').filter(Boolean));
                                } else {
                                  setSelectedDuplicates([]);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Views</TableCell>
                          <TableCell>Likes/Dislikes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {duplicateSets[selectedDuplicateSet].items.map((item) => (
                          <TableRow 
                            key={item._id}
                            selected={selectedDuplicates.includes(item._id || '')}
                            hover
                          >
                            <TableCell padding="checkbox">
                              <Checkbox 
                                checked={selectedDuplicates.includes(item._id || '')}
                                onChange={() => handleDuplicateSelect(item._id || '')}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                ID: {item._id ? item._id.substring(0, 8) + '...' : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>{getCategoryName(item.category)}</TableCell>
                            <TableCell>{renderStatusChip(item.status)}</TableCell>
                            <TableCell>{item.views}</TableCell>
                            <TableCell>
                              {item.actionSummary || (item.ratings ? `${item.ratings.likes} / ${item.ratings.dislikes} / 0` : '0/0/0')}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Rewrite Content">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => handleRewriteDuplicate(item._id || '', selectedModel)}
                                >
                                  <AutoFixHighIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    handleCloseDuplicateDialog();
                                    handleOpenContentDialog('view', item);
                                  }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    handleCloseDuplicateDialog();
                                    handleOpenContentDialog('edit', item);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDuplicateDialog}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="warning"
            disabled={selectedDuplicates.length === 0}
            onClick={() => {
              const selectedItems = duplicateSets[selectedDuplicateSet].items
                .filter(item => selectedDuplicates.includes(item._id || ''));
              
              // Keep the first item, rewrite the rest
              if (selectedItems.length > 1) {
                const itemsToRewrite = selectedItems.slice(1);
                itemsToRewrite.forEach(item => {
                  handleRewriteDuplicate(item._id || '', selectedModel);
                });
              }
            }}
            startIcon={<AutoFixHighIcon />}
          >
            Rewrite Selected ({selectedDuplicates.length})
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={selectedDuplicates.length === 0}
            onClick={handleDeleteSelectedDuplicates}
            startIcon={<DeleteIcon />}
          >
            Delete Selected ({selectedDuplicates.length})
          </Button>
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

      {/* Add a new TabPanel for Pools */}
      <TabPanel value={tabValue} index={5}>
        {loadingPools ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Content Pools
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Content is automatically sorted into different pools based on user interactions. 
              Here you can manage content in each pool and move items between pools.
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item sx={{ display: 'flex' }}>
                <Chip 
                  label={`Regular (${poolContent.regular.length})`}
                  color="default"
                  variant={poolFilter === 'regular' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setPoolFilter(prev => prev === 'regular' ? 'all' : 'regular');
                    handleSearch();
                  }}
                />
              </Grid>
              <Grid item sx={{ display: 'flex' }}>
                <Chip 
                  label={`Accepted (${poolContent.accepted.length})`}
                  color="primary"
                  variant={poolFilter === 'accepted' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setPoolFilter(prev => prev === 'accepted' ? 'all' : 'accepted');
                    handleSearch();
                  }}
                />
              </Grid>
              <Grid item sx={{ display: 'flex' }}>
                <Chip 
                  label={`Highly Liked (${poolContent.highly_liked.length})`}
                  color="success"
                  variant={poolFilter === 'highly_liked' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setPoolFilter(prev => prev === 'highly_liked' ? 'all' : 'highly_liked');
                    handleSearch();
                  }}
                />
              </Grid>
              <Grid item sx={{ display: 'flex' }}>
                <Chip 
                  label={`Disliked (${poolContent.disliked.length})`}
                  color="error"
                  variant={poolFilter === 'disliked' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setPoolFilter(prev => prev === 'disliked' ? 'all' : 'disliked');
                    handleSearch();
                  }}
                />
              </Grid>
              <Grid item sx={{ display: 'flex' }}>
                <Chip 
                  label={`Premium (${poolContent.premium.length})`}
                  color="secondary"
                  variant={poolFilter === 'premium' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setPoolFilter(prev => prev === 'premium' ? 'all' : 'premium');
                    handleSearch();
                  }}
                />
              </Grid>
            </Grid>
            
            <Button 
              variant="outlined"
              onClick={() => fetchPoolContent('all')}
              startIcon={<RefreshIcon />}
              size="small"
            >
              Refresh Pools
            </Button>
          </Box>
        )}
      </TabPanel>
    </Box>
  );
};

export default ContentManager; 