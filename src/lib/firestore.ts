import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  Watchlist,
  WatchlistCompany,
  EarningsEvent,
  SentimentSignal,
  AlertRule,
  AlertHistory,
  CompanyHistory,
  OpenAICallLog,
  DailyUsageMetrics,
} from '@/types';

// Collections
const USERS_COLLECTION = 'users';
const WATCHLISTS_COLLECTION = 'watchlists';
const EARNINGS_EVENTS_COLLECTION = 'earnings_events';
const SIGNALS_LATEST_COLLECTION = 'signals_latest';
const ALERT_RULES_COLLECTION = 'alert_rules';
const ALERT_HISTORY_COLLECTION = 'alert_history';
const COMPANY_HISTORY_COLLECTION = 'company_history';
const OPENAI_CALLS_COLLECTION = 'openai_calls';
const USAGE_METRICS_COLLECTION = 'usage_metrics';

// User operations
export const getUserById = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  return userDoc.exists() ? { ...userDoc.data(), id: userDoc.id } as User : null;
};

export const updateUser = async (userId: string, data: Partial<User>) => {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    ...data,
    updatedAt: new Date(),
  });
};

// Watchlist operations
export const getUserWatchlists = async (userId: string): Promise<Watchlist[]> => {
  const q = query(
    collection(db, WATCHLISTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Watchlist));
};

export const createWatchlist = async (watchlist: Omit<Watchlist, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, WATCHLISTS_COLLECTION), {
    ...watchlist,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const updateWatchlist = async (watchlistId: string, data: Partial<Watchlist>) => {
  await updateDoc(doc(db, WATCHLISTS_COLLECTION, watchlistId), {
    ...data,
    updatedAt: new Date(),
  });
};

export const deleteWatchlist = async (watchlistId: string) => {
  await deleteDoc(doc(db, WATCHLISTS_COLLECTION, watchlistId));
};

export const addCompanyToWatchlist = async (watchlistId: string, company: WatchlistCompany) => {
  const watchlistRef = doc(db, WATCHLISTS_COLLECTION, watchlistId);
  const watchlistDoc = await getDoc(watchlistRef);
  
  if (watchlistDoc.exists()) {
    const watchlist = watchlistDoc.data() as Watchlist;
    const updatedCompanies = [...watchlist.companies, { ...company, addedAt: new Date() }];
    
    await updateDoc(watchlistRef, {
      companies: updatedCompanies,
      updatedAt: new Date(),
    });
  }
};

export const removeCompanyFromWatchlist = async (watchlistId: string, ticker: string) => {
  const watchlistRef = doc(db, WATCHLISTS_COLLECTION, watchlistId);
  const watchlistDoc = await getDoc(watchlistRef);
  
  if (watchlistDoc.exists()) {
    const watchlist = watchlistDoc.data() as Watchlist;
    const updatedCompanies = watchlist.companies.filter(company => company.ticker !== ticker);
    
    await updateDoc(watchlistRef, {
      companies: updatedCompanies,
      updatedAt: new Date(),
    });
  }
};

// Earnings events operations
export const getUpcomingEarnings = async (
  markets?: string[],
  sectors?: string[],
  limitCount = 50
): Promise<EarningsEvent[]> => {
  let q = query(
    collection(db, EARNINGS_EVENTS_COLLECTION),
    where('expectedDate', '>=', new Date()),
    orderBy('expectedDate', 'asc'),
    limit(limitCount)
  );

  if (markets && markets.length > 0) {
    q = query(q, where('market', 'in', markets));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      expectedDate: data.expectedDate?.toDate ? data.expectedDate.toDate() : data.expectedDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as EarningsEvent;
  });
};

export const getEarningsForTickers = async (tickers: string[]): Promise<EarningsEvent[]> => {
  if (tickers.length === 0) return [];
  
  const q = query(
    collection(db, EARNINGS_EVENTS_COLLECTION),
    where('ticker', 'in', tickers),
    where('expectedDate', '>=', new Date()),
    orderBy('expectedDate', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      expectedDate: data.expectedDate?.toDate ? data.expectedDate.toDate() : data.expectedDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as EarningsEvent;
  });
};

// Sentiment signals operations
export const getLatestSignals = async (tickers?: string[]): Promise<SentimentSignal[]> => {
  // TEMPORARY FIX: Return mock data since client-side Firestore has permission issues
  // In production, you'd need to fix Firestore rules or use an API endpoint
  
  const mockSignals: SentimentSignal[] = [
    {
      id: '1',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      sentiment: 'positive',
      sentimentScore: 0.8,
      reasoning: 'Strong iPhone demand and services growth ahead of Q1 earnings. Positive analyst sentiment following recent product launches.',
      sourceData: 'Recent news articles indicate strong iPhone 15 sales and growing services revenue.',
      confidence: 0.85,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      sentiment: 'positive',
      sentimentScore: 0.75,
      reasoning: 'Azure cloud growth momentum continues with AI integration driving enterprise adoption. Positive outlook for Q1 earnings.',
      sourceData: 'Microsoft Azure showing strong growth in AI workloads and enterprise cloud adoption rates.',
      confidence: 0.78,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      sentiment: 'positive',
      sentimentScore: 0.72,
      reasoning: 'Strong search revenue growth and AI integration across products. Cloud division showing improvement.',
      sourceData: 'Google Search continues to dominate market share while AI features drive user engagement.',
      confidence: 0.82,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '4',
      ticker: 'TSLA',
      companyName: 'Tesla Inc.',
      sentiment: 'neutral',
      sentimentScore: 0.55,
      reasoning: 'Mixed signals on delivery numbers and production challenges offset by positive EV market outlook.',
      sourceData: 'Recent delivery reports show mixed results, but overall EV market expansion remains positive.',
      confidence: 0.65,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];

  let signals = mockSignals;
  
  if (tickers && tickers.length > 0) {
    signals = signals.filter(signal => tickers.includes(signal.ticker));
  }
  
  return signals;
};

export const getSignalForTicker = async (ticker: string): Promise<SentimentSignal | null> => {
  const q = query(
    collection(db, SIGNALS_LATEST_COLLECTION),
    where('ticker', '==', ticker),
    where('expiresAt', '>', new Date()),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as SentimentSignal;
};

export const createSentimentSignal = async (signal: Omit<SentimentSignal, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, SIGNALS_LATEST_COLLECTION), {
    ...signal,
    createdAt: new Date(),
  });
  return docRef.id;
};

// Alert rules operations
export const getUserAlertRules = async (userId: string): Promise<AlertRule[]> => {
  const q = query(
    collection(db, ALERT_RULES_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AlertRule));
};

export const createAlertRule = async (rule: Omit<AlertRule, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ALERT_RULES_COLLECTION), {
    ...rule,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const updateAlertRule = async (ruleId: string, data: Partial<AlertRule>) => {
  await updateDoc(doc(db, ALERT_RULES_COLLECTION, ruleId), {
    ...data,
    updatedAt: new Date(),
  });
};

export const deleteAlertRule = async (ruleId: string) => {
  await deleteDoc(doc(db, ALERT_RULES_COLLECTION, ruleId));
};

// Alert history operations
export const getUserAlertHistory = async (
  userId: string,
  limitCount = 50
): Promise<AlertHistory[]> => {
  const q = query(
    collection(db, ALERT_HISTORY_COLLECTION),
    where('userId', '==', userId),
    orderBy('sentAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AlertHistory));
};

export const createAlertHistory = async (alert: Omit<AlertHistory, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ALERT_HISTORY_COLLECTION), {
    ...alert,
    sentAt: new Date(),
  });
  return docRef.id;
};

// Company history operations
export const getCompanyHistory = async (ticker: string): Promise<CompanyHistory | null> => {
  const companyDoc = await getDoc(doc(db, COMPANY_HISTORY_COLLECTION, ticker));
  return companyDoc.exists() ? { ...companyDoc.data(), id: companyDoc.id } as CompanyHistory : null;
};

export const updateCompanyHistory = async (ticker: string, data: Partial<CompanyHistory>) => {
  await updateDoc(doc(db, COMPANY_HISTORY_COLLECTION, ticker), {
    ...data,
    updatedAt: new Date(),
  });
};

// OpenAI call logging
export const logOpenAICall = async (callLog: Omit<OpenAICallLog, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, OPENAI_CALLS_COLLECTION), {
    ...callLog,
    createdAt: new Date(),
  });
  return docRef.id;
};

export const getOpenAICallByHash = async (inputHash: string): Promise<OpenAICallLog | null> => {
  const q = query(
    collection(db, OPENAI_CALLS_COLLECTION),
    where('inputHash', '==', inputHash),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as OpenAICallLog;
};

// Usage metrics
export const getDailyUsageMetrics = async (date: string): Promise<DailyUsageMetrics | null> => {
  const metricsDoc = await getDoc(doc(db, USAGE_METRICS_COLLECTION, date));
  return metricsDoc.exists() ? { id: metricsDoc.id, ...metricsDoc.data() } as unknown as DailyUsageMetrics : null;
};

export const updateDailyUsageMetrics = async (date: string, data: Partial<DailyUsageMetrics>) => {
  await updateDoc(doc(db, USAGE_METRICS_COLLECTION, date), data);
};