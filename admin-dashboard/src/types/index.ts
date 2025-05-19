// User types
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  avatar: string | null;
  active: boolean;
  verified: boolean;
  // Google Authentication Fields
  googleId?: string;
  googlePicture?: string | null;
  emailVerified?: boolean;
  subscription: Subscription;
  preferences: UserPreferences;
  stats: UserStats;
  progress: UserProgress;
  deviceTokens: string[];
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

export interface Subscription {
  tier: 'free' | 'basic' | 'premium';
  status: 'none' | 'active' | 'cancelled' | 'expired';
  startDate: string | null;
  endDate: string | null;
  paymentMethod: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
  };
  contentPreferences: {
    categories: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  };
  theme: 'light' | 'dark' | 'system';
}

export interface UserStats {
  streak: {
    current: number;
    longest: number;
    lastActivity?: string;
  };
  totalContentViewed: number;
  totalLikes: number;
  totalDislikes: number;
  categoriesExplored: number;
}

export interface UserProgress {
  completedContent: string[];
  savedContent: string[];
  categoryProgress: CategoryProgress[];
}

export interface CategoryProgress {
  categoryId: string;
  completed: number;
  total: number;
}

// Category types
export interface Category {
  _id?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  slug?: string;
  priority: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  contentCount?: number;
  prompt?: string;
  singlePrompt?: string;
  multiplePrompt?: string;
  promptType?: 'single' | 'multiple';
  defaultNumToGenerate?: number;
  contentType?: 'hack' | 'hack2' | 'tip' | 'tip2';
  pools?: {
    regular: number;
    accepted: number;
    highly_liked: number;
    disliked: number;
    premium: number;
  };
  isFeatured?: boolean;
  lastGenerated?: string;
  createdBy?: string | User;
}

// Content types
export interface Content {
  _id: string;
  title: string;
  body: string;
  summary: string;
  category: string | Category;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  contentType: 'hack' | 'tip' | 'hack2' | 'tip2' | 'quote';
  tags: string[];
  authorId: string;
  moderatorId?: string;
  moderationNotes?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  premium: boolean;
  views: number;
  ratings: {
    likes: number;
    dislikes: number;
  };
  // New fields for user actions from mobile app
  likeCount?: number;
  dislikeCount?: number;
  maybeCount?: number;
  actionSummary?: string; // Format: likes/dislikes/maybes
  stats?: {
    views: number;
    likes: number;
    dislikes: number;
    shares: number;
    saves: number;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  formattedCreatedAt?: string;
  pool: 'regular' | 'accepted' | 'highly_liked' | 'disliked' | 'premium';
  usageCount?: number;
  lastUsedDate?: string;
  isDuplicate?: boolean;
  originalContentId?: string;
  reason?: 'manual_delete' | 'auto_delete' | 'duplicate' | 'category_deleted' | 'other';
}

// Subscription plan types
export interface SubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  tier: 'free' | 'basic' | 'premium';
  prices: PriceOption[];
  limits: {
    dailyContent: number;
    categoryAccess: number;
    offlineAccess: boolean;
    premiumContent: boolean;
    aiAssistants: boolean;
    maxDevices: number;
  };
  active: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PriceOption {
  _id: string;
  interval: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  trialDays: number;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  data: {
    user: User;
  };
}

// API response types
export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  success?: boolean;
  data?: T;
  message?: string;
  results?: number;
  token?: string;
  refreshToken?: string;
}

// Dashboard analytics types
export interface AnalyticsData {
  totalUsers: number;
  activeSubscriptions: number;
  contentViews: number;
  contentRating: number;
  newUsers: {
    labels: string[];
    data: number[];
  };
  subscriptionTiers: {
    labels: string[];
    data: number[];
  };
  popularCategories: {
    labels: string[];
    data: number[];
  };
}

// Prompt template types
export interface PromptTemplate {
  _id: string;
  name: string;
  category: string | Category;
  contentType: 'hack' | 'tip' | 'hack2' | 'tip2' | 'quote';
  isSingle: boolean;
  templateText: string;
  description: string;
  createdBy: string | User;
  updatedBy?: string | User;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
} 