import axios from 'axios';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import type { 
  ApiResponse, 
  AuthResponse, 
  LoginCredentials, 
  User, 
  Category, 
  Content,
  SubscriptionPlan,
  PromptTemplate
} from '../types';

// API base URL
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate instance with longer timeout for content generation
const longRunningApi = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Apply the same request interceptors to longRunningApi
longRunningApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post<ApiResponse<AuthResponse>>(`${API_URL}/auth/refresh`, { refreshToken });
        
        if (response.data.token && response.data.refreshToken) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
          }
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Apply interceptors
api.interceptors.response.use(
  (response) => {
    // If the response has status but no success property, add it
    if (response.data && response.data.status === 'success' && response.data.success === undefined) {
      response.data.success = true;
    }
    return response;
  },
  (error) => {
    // Log rate limiting issues
    if (error.response?.status === 429) {
      console.warn('Rate limit hit (HTTP 429). Consider reducing request frequency.');
      
      // If retry-after header is present, log it
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        console.info(`Server advised to retry after ${retryAfter} seconds`);
      }
    }
    return Promise.reject(error);
  }
);

// Apply the same response interceptors to longRunningApi
longRunningApi.interceptors.response.use(
  (response) => {
    // If the response has status but no success property, add it
    if (response.data && response.data.status === 'success' && response.data.success === undefined) {
      response.data.success = true;
    }
    return response;
  },
  (error) => {
    // Log rate limiting issues
    if (error.response?.status === 429) {
      console.warn('Rate limit hit (HTTP 429). Consider reducing request frequency.');
      
      // If retry-after header is present, log it
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        console.info(`Server advised to retry after ${retryAfter} seconds`);
      }
    }
    return Promise.reject(error);
  }
);

// Also apply the token refresh interceptor
longRunningApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post<ApiResponse<AuthResponse>>(`${API_URL}/auth/refresh`, { refreshToken });
        
        if (response.data.token && response.data.refreshToken) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
          }
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Axios error handler helper
const handleApiError = (error: any, operation: string) => {
  console.error(`Error during ${operation}:`, error);
  
  // Network errors don't have response property
  if (!error.response) {
    throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
  }
  
  // Server returned an error response
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  
  // Generic error
  throw error;
};

// Authentication APIs
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User }>> => {
    // Special handling for admin user to bypass rate limiting issues
    const isAdminUser = credentials.email === 'admin@example.com';
    
    // Add retry logic with exponential backoff especially for admin user
    const maxRetries = isAdminUser ? 5 : 3;
    let retries = 0;
    let lastError: any;

    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          // Exponential backoff: 2 seconds, 4 seconds, 8 seconds...
          const backoffTime = Math.pow(2, retries) * 1000;
          console.log(`Retrying login (${retries}/${maxRetries}) after ${backoffTime}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }

        const response = await api.post<ApiResponse<{ user: User }>>('/auth/login', credentials);
        
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        if (response.data.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // If it's a rate limit error (429), retry
        if (error.response && error.response.status === 429) {
          console.warn('Login rate limit hit (429), will retry with backoff...');
          retries++;
          continue;
        }
        
        // For other errors, don't retry
        break;
      }
    }
    
    // If we've exhausted all retries or had a different error, handle it
    console.error('Login failed after retries:', lastError);
    throw lastError;
  },
  
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/users/profile');
    return response.data;
  },
};

// User APIs
export const userAPI = {
  getAllUsers: async (page = 1, limit = 10): Promise<ApiResponse<{ users: User[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ users: User[] }>>('/admin/users', { 
        params: { page, limit } 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  getUserById: async (userId: string): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.get<ApiResponse<{ user: User }>>(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },
  
  updateUser: async (userId: string, userData: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.patch<ApiResponse<{ user: User }>>(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },
  
  deleteUser: async (userId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await api.delete<ApiResponse<null>>(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }
};

// Category APIs
export const categoryAPI = {
  getAllCategories: async (): Promise<ApiResponse<{ categories: Category[] }>> => {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>('/categories');
    return response.data;
  },
  
  getCategoryById: async (categoryId: string): Promise<ApiResponse<{ category: Category }>> => {
    const response = await api.get<ApiResponse<{ category: Category }>>(`/categories/${categoryId}`);
    return response.data;
  },
  
  getCategoriesWithPoolStats: async (): Promise<ApiResponse<{ categories: Category[] }>> => {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>('/categories/stats/pools');
    return response.data;
  },
  
  createCategory: async (categoryData: Partial<Category>): Promise<ApiResponse<{ category: Category }>> => {
    console.log('DEBUG [API_CREATE_REQUEST] Request payload:', JSON.stringify(categoryData, null, 2));
    
    // Ensure contentType is included in the request
    const requestData = {
      ...categoryData,
      contentType: categoryData.contentType || 'hack'
    };
    
    console.log('DEBUG [API_CREATE_FINAL] Final request payload:', JSON.stringify(requestData, null, 2));
    const response = await api.post<ApiResponse<{ category: Category }>>('/categories', requestData);
    console.log('DEBUG [API_CREATE_RESPONSE] Server response:', JSON.stringify(response.data, null, 2));
    return response.data;
  },
  
  updateCategory: async (categoryId: string, categoryData: Partial<Category>): Promise<ApiResponse<{ category: Category }>> => {
    console.log('DEBUG [API_UPDATE_REQUEST] Request payload:', JSON.stringify(categoryData, null, 2));
    
    // Ensure contentType is included in the request
    const requestData = {
      ...categoryData,
      contentType: categoryData.contentType || 'hack'
    };
    
    console.log('DEBUG [API_UPDATE_FINAL] Final request payload:', JSON.stringify(requestData, null, 2));
    const response = await api.patch<ApiResponse<{ category: Category }>>(`/categories/${categoryId}`, requestData);
    console.log('DEBUG [API_UPDATE_RESPONSE] Server response:', JSON.stringify(response.data, null, 2));
    return response.data;
  },
  
  deleteCategory: async (categoryId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/categories/${categoryId}`);
    return response.data;
  },
  
  activateAllCategories: async (): Promise<ApiResponse<{ activatedCount: number }>> => {
    try {
      const response = await api.post<ApiResponse<{ activatedCount: number }>>('/categories/activate-all');
      return response.data;
    } catch (error) {
      console.error('Error activating all categories:', error);
      throw error;
    }
  }
};

// Content APIs
export const contentAPI = {
  getAllContent: async (page = 1, limit = 10, status?: string, contentType?: string, difficulty?: string, pool?: string, search?: string, category?: string, isDuplicate?: boolean): Promise<ApiResponse<{ content: Content[], pagination?: { total: number, page: number, pages: number, limit: number } }>> => {
    try {
      console.log('API Request Params:', { page, limit, status, contentType, difficulty, pool, search, category, isDuplicate });
      
      // Önbelleği bypass etmek için _nocache parametresi ekle (her zaman güncel veri gelsin diye)
      const response = await api.get<ApiResponse<{ content: Content[], pagination?: { total: number, page: number, pages: number, limit: number } }>>('/content', { 
        params: { 
          page, 
          limit, 
          status, 
          contentType, 
          difficulty,
          pool,
          search,
          category,
          isDuplicate
        } 
      });
      
      // Gelen verilerde actionSummary değerlerini düzgün biçimde dolduralım
      if (response.data?.data?.content && Array.isArray(response.data.data.content)) {
        response.data.data.content.forEach(item => {
          // likeCount/dislikeCount/maybeCount ve actionSummary alanlarını kontrol et
          // Eğer actionSummary yoksa hesapla
          if (!item.actionSummary) {
            const likeCount = item.likeCount || 0;
            const dislikeCount = item.dislikeCount || 0;
            const maybeCount = item.maybeCount || 0;
            item.actionSummary = `${likeCount}/${dislikeCount}/${maybeCount}`;
          }
          
          // Eski ratings değerlerini de uyumlu hale getir (geriye dönük uyumluluk)
          if (!item.ratings) {
            item.ratings = { likes: 0, dislikes: 0 };
          }
          if (item.likeCount && !item.ratings.likes) {
            item.ratings.likes = item.likeCount;
          }
          if (item.dislikeCount && !item.ratings.dislikes) {
            item.ratings.dislikes = item.dislikeCount;
          }
        });
      }
      
      // Log the response for debugging
      console.log('API Response structure:', Object.keys(response.data));
      console.log('API Response data:', Object.keys(response.data.data || {}));
      console.log('API Response content length:', response.data?.data?.content?.length || 0);
      console.log('Mobile Action Counts (First 3 items):', response.data?.data?.content?.slice(0, 3).map(c => ({ 
        id: c._id,
        title: c.title?.substring(0, 20),
        actionSummary: c.actionSummary || 'N/A',
        likeCount: c.likeCount || 0,
        dislikeCount: c.dislikeCount || 0,
        maybeCount: c.maybeCount || 0
      })));
      
      // isDuplicate filter is true - only show duplicate content
      if (isDuplicate === true) {
        console.log('==== DUPLICATE CONTENT ITEMS (isDuplicate: true) ====');
        const duplicateItems = response.data?.data?.content?.filter(item => item.isDuplicate === true) || [];
        console.log(`Found ${duplicateItems.length} items with isDuplicate=true`);
        console.log(JSON.stringify(duplicateItems, null, 2));
        console.log('==== END OF DUPLICATE CONTENT ITEMS ====');
      } else {
        // Log the complete content data in JSON format
        console.log('==== CONTENT DATA IN JSON FORMAT ====');
        console.log(JSON.stringify(response.data?.data?.content, null, 2));
        console.log('==== END OF CONTENT DATA ====');
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error, 'fetching content');
    }
  },
  
  getPendingContent: async (): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content[] }>>('/admin/content/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending content:', error);
      throw error;
    }
  },
  
  getContentById: async (contentId: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content }>>(`/content/${contentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching content ${contentId}:`, error);
      throw error;
    }
  },
  
  createContent: async (contentData: Partial<Content>): Promise<ApiResponse<{ content: Content }>> => {
    try {
      // Ensure required fields are set
      if (!contentData.contentType) {
        contentData.contentType = 'hack';
      }
      
      if (!contentData.status) {
        contentData.status = 'draft';
      }
      
      if (!contentData.difficulty) {
        contentData.difficulty = 'beginner';
      }
      
      if (!contentData.pool) {
        contentData.pool = 'regular';
      }
      
      // Add default values for stats
      if (!contentData.stats) {
        contentData.stats = {
          views: 0,
          likes: 0,
          dislikes: 0,
          shares: 0,
          saves: 0
        };
      }
      
      console.log('Creating content with data:', JSON.stringify(contentData, null, 2));
      
      // Use the admin API endpoint for content creation
      const response = await api.post<ApiResponse<{ content: Content }>>('/admin/content', contentData);
      
      // Check if response is successful
      if (response.data && (response.data.success || response.data.status === 'success')) {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Unknown error creating content');
      }
    } catch (error: any) {
      console.error('Error creating content:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
      
      // Return a structured error response
      return {
        success: false,
        status: 'error',
        message: `Failed to create content: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        data: { content: {} as Content }
      };
    }
  },
  
  updateContent: async (contentId: string, contentData: Partial<Content>): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.patch<ApiResponse<{ content: Content }>>(`/content/${contentId}`, contentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating content ${contentId}:`, error);
      throw error;
    }
  },
  
  deleteContent: async (contentId: string): Promise<ApiResponse<null>> => {
    try {
      console.log(`Attempting to delete content with ID: ${contentId}`);
      // Use the admin API endpoint instead (this is why we're getting 404 errors)
      const response = await api.delete<ApiResponse<null>>(`/admin/content/${contentId}`);
      
      // Check if the response was successful
      if (!response.data.success && response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to delete content');
      }
      
      return response.data;
    } catch (error: any) { // Add the 'any' type to fix the linter error
      console.error(`Error deleting content ${contentId}:`, error);
      
      // Add better error details in the message
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      return {
        success: false,
        status: 'error',
        message: `Failed to delete content: ${errorMessage}`,
        data: null
      };
    }
  },
  
  moderateContent: async (contentId: string, action: 'approve' | 'reject', notes?: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.patch<ApiResponse<{ content: Content }>>(`/admin/content/${contentId}/moderate`, {
        action,
        moderationNotes: notes
      });
      return response.data;
    } catch (error) {
      console.error(`Error moderating content ${contentId}:`, error);
      throw error;
    }
  },
  
  generateContent: async (params: { 
    categoryIds: string[], 
    contentType?: string, 
    count?: number 
  }): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      // Use longRunningApi for content generation which may take longer
      const response = await longRunningApi.post<ApiResponse<{ content: Content[] }>>('/admin/content/generate', params);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'generating content');
    }
  },
  
  generateMultipleContent: async (categoryId: string, contentType?: string, count: number = 10, difficulty: string = 'beginner', model?: string): Promise<ApiResponse<{ content: Content[] }>> => {
    // Add retry logic with exponential backoff
    const maxRetries = 3;
    let retries = 0;
    let lastError: any;

    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          // Exponential backoff: 2 seconds, 4 seconds, 8 seconds...
          const backoffTime = Math.pow(2, retries) * 1000;
          console.log(`Retrying API call (${retries}/${maxRetries}) after ${backoffTime}ms delay due to rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }

        // Use longRunningApi for content generation which may take longer
        const response = await longRunningApi.post<ApiResponse<{ content: Content[] }>>('/content/generate-multiple', {
          categoryId,
          contentType,
          count,
          difficulty,
          model
        });
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // If it's a rate limit error (429), retry
        if (error.response && error.response.status === 429) {
          console.warn('Rate limit hit (429), will retry with backoff...');
          retries++;
          continue;
        }
        
        // For other errors, don't retry
        break;
      }
    }
    
    // If we've exhausted all retries or had a different error, handle it
    return handleApiError(lastError, 'generating content');
  },

  getContentByPool: async (pool: string = 'regular', category?: string, contentType?: string): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content[] }>>('/content/pool', {
        params: { pool, category, contentType }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching content by pool:', error);
      throw error;
    }
  },
  
  recycleContent: async (contentId: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.post<ApiResponse<{ content: Content }>>(`/content/${contentId}/recycle`);
      return response.data;
    } catch (error) {
      console.error(`Error recycling content ${contentId}:`, error);
      throw error;
    }
  },
  
  rewriteContent: async (contentId: string, model: string = 'o3'): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await longRunningApi.post<ApiResponse<{ content: Content }>>(`/content/${contentId}/rewrite`, {
        model: model
      });
      return response.data;
    } catch (error) {
      console.error(`Error rewriting content ${contentId}:`, error);
      throw error;
    }
  },
  
  // Move published content to deleted status for a specific category
  movePublishedToDeleted: async (categoryId: string, count: number = 10): Promise<ApiResponse<{ categoryId: string, totalFound: number, movedToDeleted: number }>> => {
    try {
      const response = await api.post<ApiResponse<{ categoryId: string, totalFound: number, movedToDeleted: number }>>('/admin/content/move-published-to-deleted', {
        categoryId,
        count
      });
      return response.data;
    } catch (error) {
      console.error('Error moving published content to deleted:', error);
      throw error;
    }
  },
  
  // Clean up duplicate content - keep one representative and delete the others with 'duplicate' reason
  cleanupDuplicateContent: async (): Promise<ApiResponse<{ totalProcessed: number, keptCount: number, deletedCount: number }>> => {
    try {
      const response = await api.post<ApiResponse<{ totalProcessed: number, keptCount: number, deletedCount: number }>>('/admin/content/cleanup-duplicates', {});
      return response.data;
    } catch (error) {
      console.error('Error cleaning up duplicate content:', error);
      throw error;
    }
  },
  
  // New function to bulk publish content
  bulkPublishContent: async (contentIds: string[]): Promise<ApiResponse<{ totalUpdated: number }>> => {
    try {
      const response = await api.post<ApiResponse<{ totalUpdated: number }>>('/admin/content/bulk-publish', {
        contentIds
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk publishing content:', error);
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error bulk publishing content',
        data: { totalUpdated: 0 }
      };
    }
  },
  
  getDeletedContent: async (page = 1, limit = 10, search?: string, category?: string, contentType?: string, difficulty?: string, reason?: string): Promise<ApiResponse<{ content: Content[], totalCount: number }>> => {
    try {
      console.log('Calling API with params:', {
        page,
        limit,
        search,
        category,
        contentType,
        difficulty,
        reason
      });

      const response = await api.get<ApiResponse<{ content: Content[], totalCount: number }>>('/content/deleted', {
        params: {
          page,
          limit,
          search,
          category,
          contentType,
          difficulty,
          reason,
          _nocache: Date.now() // Bypass cache
        }
      });

      console.log('Raw API response:', response);

      // Ensure we have a properly structured response
      if (!response.data) {
        console.error('Empty response from API');
        return {
          success: false,
          status: 'error',
          message: 'Empty response from API',
          data: { content: [], totalCount: 0 }
        };
      }

      // Format like/dislike data if needed
      if (response.data?.data?.content && Array.isArray(response.data.data.content)) {
        console.log('Processing content items:', response.data.data.content.length);
        response.data.data.content.forEach((item: Content) => {
          if (!item.actionSummary) {
            const likeCount = item.likeCount || 0;
            const dislikeCount = item.dislikeCount || 0;
            const maybeCount = item.maybeCount || 0;
            item.actionSummary = `${likeCount}/${dislikeCount}/${maybeCount}`;
          }
          
          if (!item.ratings) {
            item.ratings = { likes: 0, dislikes: 0 };
          }
          if (item.likeCount && !item.ratings.likes) {
            item.ratings.likes = item.likeCount;
          }
          if (item.dislikeCount && !item.ratings.dislikes) {
            item.ratings.dislikes = item.dislikeCount;
          }
        });
      } else {
        console.warn('No content array in API response or invalid structure', response.data);
        
        // Ensure there's always a content array, even if empty
        if (response.data.data && !response.data.data.content) {
          response.data.data.content = [];
        } else if (!response.data.data) {
          response.data.data = { content: [], totalCount: 0 };
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error in getDeletedContent:', error);
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error fetching deleted content',
        data: { content: [], totalCount: 0 }
      };
    }
  },
  
  restoreDeletedContent: async (contentId: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.post<ApiResponse<{ content: Content }>>(`/content/deleted/${contentId}/restore`);
      return response.data;
    } catch (error) {
      console.error(`Error restoring content ${contentId}:`, error);
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error restoring content',
        data: { content: {} as Content }
      };
    }
  },
  
  permanentlyDeleteContent: async (contentId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await api.delete<ApiResponse<null>>(`/content/deleted/${contentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error permanently deleting content ${contentId}:`, error);
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error permanently deleting content',
        data: null
      };
    }
  },
  
  getCategories: async (): Promise<ApiResponse<{ categories: any[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ categories: any[] }>>('/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return handleApiError(error, 'fetching categories');
    }
  },
};

// Analytics APIs
export const analyticsAPI = {
  getContentAnalytics: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get<ApiResponse<any>>('/admin/analytics/content');
      
      // Ensure we have the actionSummary field or create it from the counts
      if (response.data?.data && Array.isArray(response.data.data)) {
        response.data.data.forEach((content: any) => {
          if (!content.actionSummary) {
            const likeCount = content.likeCount || 0;
            const dislikeCount = content.dislikeCount || 0;
            const maybeCount = content.maybeCount || 0;
            content.actionSummary = `${likeCount}/${dislikeCount}/${maybeCount}`;
          }
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching content analytics:', error);
      return handleApiError(error, 'fetching content analytics');
    }
  },
  
  getUserAnalytics: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get<ApiResponse<any>>('/admin/analytics/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return handleApiError(error, 'fetching user analytics');
    }
  }
};

// Subscription plan APIs
export const subscriptionAPI = {
  getAllPlans: async (): Promise<ApiResponse<{ plans: SubscriptionPlan[] }>> => {
    const response = await api.get<ApiResponse<{ plans: SubscriptionPlan[] }>>('/subscription/plans');
    return response.data;
  },
  
  getPlanById: async (planId: string): Promise<ApiResponse<{ plan: SubscriptionPlan }>> => {
    const response = await api.get<ApiResponse<{ plan: SubscriptionPlan }>>(`/subscription/plans/${planId}`);
    return response.data;
  },
  
  createPlan: async (planData: Partial<SubscriptionPlan>): Promise<ApiResponse<{ plan: SubscriptionPlan }>> => {
    const response = await api.post<ApiResponse<{ plan: SubscriptionPlan }>>('/subscription/plans', planData);
    return response.data;
  },
  
  updatePlan: async (planId: string, planData: Partial<SubscriptionPlan>): Promise<ApiResponse<{ plan: SubscriptionPlan }>> => {
    const response = await api.patch<ApiResponse<{ plan: SubscriptionPlan }>>(`/subscription/plans/${planId}`, planData);
    return response.data;
  },
  
  deletePlan: async (planId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/subscription/plans/${planId}`);
    return response.data;
  }
};

// Prompt template APIs
export const promptAPI = {
  getAllPromptTemplates: async (category?: string, contentType?: string): Promise<ApiResponse<{ templates: PromptTemplate[] }>> => {
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (contentType) params.contentType = contentType;
      
      const response = await api.get<ApiResponse<{ templates: PromptTemplate[] }>>('/prompts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching prompt templates:', error);
      throw error;
    }
  },
  
  getPromptTemplateById: async (templateId: string): Promise<ApiResponse<{ template: PromptTemplate }>> => {
    try {
      const response = await api.get<ApiResponse<{ template: PromptTemplate }>>(`/prompts/${templateId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching prompt template by ID:`, error);
      throw error;
    }
  },
  
  seedPromptsFromDefaultFile: async (): Promise<ApiResponse<{ updatedCategories: number; newPrompts: number }>> => {
    try {
      const response = await api.post<ApiResponse<{ updatedCategories: number; newPrompts: number }>>('/prompts/seed-default');
      return response.data;
    } catch (error) {
      console.error('Error seeding prompts from default file:', error);
      throw error;
    }
  }
};