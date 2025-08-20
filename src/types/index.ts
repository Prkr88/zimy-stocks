export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastLogin: Date;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  alertSettings: AlertSettings;
}

export interface AlertSettings {
  enabledMarkets: string[];
  enabledSectors: string[];
  minSentimentScore: number;
}

export interface Watchlist {
  id: string;
  userId: string;
  companies: WatchlistCompany[];
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistCompany {
  ticker: string;
  companyName: string;
  market: 'SP500' | 'TA125';
  sector: string;
  addedAt: Date;
}

export interface EarningsEvent {
  id: string;
  ticker: string;
  companyName: string;
  expectedDate: Date;
  expectedTime: 'before_market' | 'after_market' | 'during_market';
  market: 'SP500' | 'TA125';
  sector: string;
  quarter: string;
  fiscalYear: number;
  analystEstimate?: number;
  previousEarnings?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SentimentSignal {
  id: string;
  ticker: string;
  companyName: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  reasoning: string;
  sourceData: string;
  confidence: number;
  createdAt: Date;
  expiresAt: Date;
  openaiCallId?: string;
}

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'watchlist_earnings' | 'sentiment_available' | 'high_confidence';
  parameters: Record<string, any>;
}

export interface AlertAction {
  type: 'push_notification' | 'email';
  parameters: Record<string, any>;
}

export interface AlertHistory {
  id: string;
  userId: string;
  ruleId: string;
  ticker: string;
  type: string;
  message: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
}

export interface CompanyHistory {
  id: string;
  ticker: string;
  companyName: string;
  events: HistoryEvent[];
  insights: HistoricalInsight[];
  alerts: HistoricalAlert[];
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoryEvent {
  type: 'earnings_release' | 'sentiment_update' | 'watchlist_add';
  date: Date;
  data: Record<string, any>;
}

export interface HistoricalInsight {
  sentimentSignal: SentimentSignal;
  accuracy?: number;
  actualOutcome?: string;
  notes?: string;
}

export interface HistoricalAlert {
  alertHistory: AlertHistory;
  context: Record<string, any>;
}

export interface OpenAICallLog {
  id: string;
  ticker: string;
  inputHash: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  cost: number;
  createdAt: Date;
  resultUsed: boolean;
}

export interface DailyUsageMetrics {
  date: string;
  openaiCalls: number;
  tokensUsed: number;
  totalCost: number;
  uniqueCompanies: number;
  alertsSent: number;
}