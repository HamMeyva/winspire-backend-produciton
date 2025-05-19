import React, { useState, useEffect, useRef } from 'react';
import type { Content, Category as CategoryType } from '../types';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Chip, Button, CircularProgress, 
  Alert, Card, CardContent, Grid, TextField, FormControl, InputLabel, 
  Select, MenuItem, IconButton
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Restore as RestoreIcon, 
  Info as InfoIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { contentAPI } from '../services/api';

interface Category {
  _id: string;
  name: string;
}

const DeletedContent = () => {
  const [deletedContent, setDeletedContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortByLikes, setSortByLikes] = useState<'asc' | 'desc' | null>(null);
  const [reasonFilter, setReasonFilter] = useState('all');
  
  // Sütunlara göre sıralama için state'ler
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Add retryCount ref to track retries and prevent infinite requests
  const retryCount = useRef(0);
  const isFilterActive = useRef(false);

  useEffect(() => {
    fetchCategories();
    // Set current time as last check time
    setLastCheckTime(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    fetchDeletedContent();
  }, [page, rowsPerPage]);

  useEffect(() => {
    // Reset retry counter when search criteria changes
    retryCount.current = 0;
    
    // Track if any filter is active
    isFilterActive.current = searchTerm !== '' || 
                           categoryFilter !== 'all' || 
                           contentTypeFilter !== 'all' || 
                           difficultyFilter !== 'all' ||
                           reasonFilter !== 'all';
  }, [searchTerm, categoryFilter, contentTypeFilter, difficultyFilter, reasonFilter]);

  useEffect(() => {
    // Try again only if:
    // 1. Not currently loading
    // 2. No content found
    // 3. Haven't exceeded max retries (3)
    // 4. No active filter (only retry on initial load, not filtered searches)
    if (!loading && deletedContent.length === 0 && totalCount === 0 && 
        retryCount.current < 3 && !isFilterActive.current) {
      console.log(`No data found, retrying... (Attempt ${retryCount.current + 1}/3)`);
      retryCount.current += 1;
      
      // Add a small delay before retrying
      const timeoutId = setTimeout(() => {
        fetchDeletedContent();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading, deletedContent, totalCount]);

  const fetchCategories = async () => {
    try {
      const response = await contentAPI.getCategories();
      if (response?.data?.categories) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDeletedContent = async () => {
    setLoading(true);
    try {
      console.log('Fetching deleted content with params:', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        contentType: contentTypeFilter !== 'all' ? contentTypeFilter : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
        // Şimdilik reason parametresini göndermiyoruz, client-side filtreleyeceğiz
      });
      
      // Reason filtresi olmadan API'yi çağır
      const response = await contentAPI.getDeletedContent(
        page + 1,
        rowsPerPage,
        searchTerm || undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined,
        contentTypeFilter !== 'all' ? contentTypeFilter : undefined,
        difficultyFilter !== 'all' ? difficultyFilter : undefined
      );
      
      console.log('API Response:', response);
      
      if (response?.data?.content) {
        console.log('Content items found:', response.data.content.length);
        let content = response.data.content;
        
        // Reason filtresi client-side uygula
        if (reasonFilter !== 'all') {
          console.log(`Filtering by reason: ${reasonFilter}`);
          content = content.filter(item => {
            const itemReason = (item.reason || '').toLowerCase();
            const filterReason = reasonFilter.toLowerCase();
            console.log(`Item ${item._id}: reason=${itemReason}, match=${itemReason === filterReason}`);
            return itemReason === filterReason;
          });
          console.log(`After reason filter: ${content.length} items`);
        }
        
        // Sort by likes if requested
        if (sortByLikes) {
          content = [...content].sort((a, b) => {
            const likesA = a.likeCount || 0;
            const likesB = b.likeCount || 0;
            return sortByLikes === 'desc' ? likesB - likesA : likesA - likesB;
          });
        }
        
        setDeletedContent(content);
        setTotalCount(reasonFilter !== 'all' ? content.length : response.data.totalCount || 0);
      } else {
        console.warn('No content found in API response:', response);
        setDeletedContent([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching deleted content:', error);
      setDeletedContent([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await contentAPI.permanentlyDeleteContent(id);
      fetchDeletedContent();
    } catch (error) {
      console.error('Error permanently deleting content:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await contentAPI.restoreDeletedContent(id);
      fetchDeletedContent();
    } catch (error) {
      console.error('Error restoring content:', error);
    }
  };

  const handleChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleSearch = () => {
    setPage(0); // Reset to first page
    // Mark this as a filter-based search to prevent auto-retries on empty results
    isFilterActive.current = true; 
    fetchDeletedContent();
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent) => {
    setCategoryFilter(event.target.value);
    isFilterActive.current = event.target.value !== 'all' || 
                            searchTerm !== '' || 
                            contentTypeFilter !== 'all' || 
                            difficultyFilter !== 'all' ||
                            reasonFilter !== 'all';
  };

  const handleContentTypeFilterChange = (event: SelectChangeEvent) => {
    setContentTypeFilter(event.target.value);
    isFilterActive.current = event.target.value !== 'all' || 
                            searchTerm !== '' || 
                            categoryFilter !== 'all' || 
                            difficultyFilter !== 'all' ||
                            reasonFilter !== 'all';
  };

  const handleDifficultyFilterChange = (event: SelectChangeEvent) => {
    setDifficultyFilter(event.target.value);
    isFilterActive.current = event.target.value !== 'all' || 
                            searchTerm !== '' || 
                            categoryFilter !== 'all' || 
                            contentTypeFilter !== 'all' ||
                            reasonFilter !== 'all';
  };

  const handleReasonFilterChange = (event: SelectChangeEvent) => {
    setReasonFilter(event.target.value);
    isFilterActive.current = event.target.value !== 'all' || 
                            searchTerm !== '' || 
                            categoryFilter !== 'all' || 
                            contentTypeFilter !== 'all' ||
                            difficultyFilter !== 'all';
  };

  const toggleSortByLikes = () => {
    if (sortByLikes === null) {
      setSortByLikes('desc'); // First click: sort by highest likes
    } else if (sortByLikes === 'desc') {
      setSortByLikes('asc'); // Second click: sort by lowest likes
    } else {
      setSortByLikes(null); // Third click: reset sorting
    }
    fetchDeletedContent();
  };

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
    const sortedContent = [...deletedContent].sort((a, b) => {
      if (field === 'createdAt') {
        const dateA = new Date(a.createdAt || '');
        const dateB = new Date(b.createdAt || '');
        return sortDirection === 'asc' ? 
          dateA.getTime() - dateB.getTime() : 
          dateB.getTime() - dateA.getTime();
      } 
      else if (field === 'category') {
        const catNameA = (typeof a.category === 'string' ? 
          categories.find(c => c._id === a.category)?.name : 
          a.category?.name || 'Unknown').toLowerCase();
        
        const catNameB = (typeof b.category === 'string' ? 
          categories.find(c => c._id === b.category)?.name : 
          b.category?.name || 'Unknown').toLowerCase();

        return sortDirection === 'asc' ? 
          catNameA.localeCompare(catNameB) : 
          catNameB.localeCompare(catNameA);
      }
      return 0;
    });

    setDeletedContent(sortedContent);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Deleted Content
          <Typography variant="subtitle1" component="span" sx={{ ml: 2, color: 'text.secondary' }}>
            ({totalCount} items)
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Last updated: {lastCheckTime}
        </Typography>
      </Box>

      {/* Stats Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Total Deleted Items: {totalCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                These items are kept for 30 days before permanent deletion
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="flex-end">
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setPage(0);
                    fetchDeletedContent();
                  }}
                >
                  Refresh Data
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filter Section */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              placeholder="Search by title..."
              fullWidth
              variant="outlined"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                isFilterActive.current = e.target.value !== '' || 
                                       categoryFilter !== 'all' || 
                                       contentTypeFilter !== 'all' || 
                                       difficultyFilter !== 'all' ||
                                       reasonFilter !== 'all';
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={9}>
            <Box display="flex" gap={2}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={handleCategoryFilterChange}
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
                  onChange={handleContentTypeFilterChange}
                  label="Content Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="hack">Hack</MenuItem>
                  <MenuItem value="tip">Tip</MenuItem>
                  <MenuItem value="hack2">Hack 2</MenuItem>
                  <MenuItem value="tip2">Tip 2</MenuItem>
                  <MenuItem value="quote">Quote</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={difficultyFilter}
                  onChange={handleDifficultyFilterChange}
                  label="Difficulty"
                >
                  <MenuItem value="all">All Difficulties</MenuItem>
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Reason</InputLabel>
                <Select
                  value={reasonFilter}
                  onChange={handleReasonFilterChange}
                  label="Reason"
                >
                  <MenuItem value="all">All Reasons</MenuItem>
                  <MenuItem value="manual_delete">Manual Delete</MenuItem>
                  <MenuItem value="auto_delete">Auto Delete</MenuItem>
                  <MenuItem value="duplicate">Duplicate</MenuItem>
                  <MenuItem value="category_deleted">Category Deleted</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>

              <Button 
                variant="contained"
                color="primary"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                sx={{ ml: 2, height: 56, minWidth: 120 }}
              >
                Search
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
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
                    <TableCell>Deleted At</TableCell>
                    <TableCell>Delete Reason</TableCell>
                    <TableCell>Content Type</TableCell>
                    <TableCell>Difficulty</TableCell>
                    <TableCell 
                      onClick={toggleSortByLikes}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                        fontWeight: sortByLikes !== null ? 'bold' : 'normal'
                      }}
                    >
                      <Box display="flex" alignItems="center">
                        Likes/Dislikes
                        {sortByLikes && (
                          sortByLikes === 'desc' ? 
                            <ArrowDownwardIcon fontSize="small" /> : 
                            <ArrowUpwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>Tags</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deletedContent.length > 0 ? (
                    deletedContent.map((content) => (
                      <TableRow key={content._id}>
                        <TableCell>{content.title}</TableCell>
                        <TableCell>
                          {typeof content.category === 'object' 
                            ? content.category?.name 
                            : 'Unknown'}
                        </TableCell>
                        <TableCell>{formatDate(content.createdAt)}</TableCell>
                        <TableCell>{content.deletedAt ? formatDate(content.deletedAt) : 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={content.reason || 'unknown'} 
                            color={content.reason === 'duplicate' ? 'warning' : 
                                  content.reason === 'manual_delete' ? 'error' : 
                                  content.reason === 'auto_delete' ? 'info' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={content.contentType} 
                            color={
                              content.contentType === 'hack' ? 'primary' :
                              content.contentType === 'tip' ? 'secondary' :
                              content.contentType === 'quote' ? 'success' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {content.difficulty || 'Not specified'}
                        </TableCell>
                        <TableCell>
                          {content.actionSummary || `${content.likeCount || 0}/${content.dislikeCount || 0}/0`}
                        </TableCell>
                        <TableCell>
                          {content.tags && content.tags.length > 0 ? (
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {content.tags.map((tag, index) => (
                                <Chip 
                                  key={index}
                                  label={tag}
                                  size="small"
                                  color={tag === 'duplicated' ? 'warning' : 'default'}
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            'No tags'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            startIcon={<RestoreIcon />}
                            size="small"
                            onClick={() => handleRestore(content._id)}
                            sx={{ mr: 1 }}
                          >
                            Restore
                          </Button>
                          <Button
                            startIcon={<DeleteIcon />}
                            size="small"
                            color="error"
                            onClick={() => handlePermanentDelete(content._id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No deleted content found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DeletedContent; 