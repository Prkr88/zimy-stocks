# Zimy Stocks - Phase 1 MVP Deployment Guide

This guide provides step-by-step instructions to deploy all components of the Zimy Stocks Phase 1 MVP as outlined in PRD-Phase1.md.

## Prerequisites

Before starting deployment, ensure you have:
- Google Cloud Platform (GCP) account with billing enabled
- Firebase project created
- Vercel account
- SendGrid account
- OpenAI API key
- GitHub repository set up
- Node.js 18+ installed locally
- Google Cloud CLI installed and authenticated

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Firebase Configuration](#2-firebase-configuration)
3. [Google Cloud Platform Setup](#3-google-cloud-platform-setup)
4. [BigQuery Configuration](#4-bigquery-configuration)
5. [Next.js Frontend Setup](#5-nextjs-frontend-setup)
6. [Cloud Run Backend Services](#6-cloud-run-backend-services)
7. [Notification Services](#7-notification-services)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Monitoring and Observability](#9-monitoring-and-observability)
10. [Security Configuration](#10-security-configuration)
11. [Cost Management](#11-cost-management)
12. [Testing and Validation](#12-testing-and-validation)

---

## 1. Project Setup

### 1.1 Initialize Next.js Project

```bash
# Create new Next.js project
npx create-next-app@latest zimy-stocks --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd zimy-stocks

# Install required dependencies
npm install firebase firebase-admin
npm install @google-cloud/firestore @google-cloud/bigquery @google-cloud/secret-manager
npm install openai
npm install @sendgrid/mail
npm install @sentry/nextjs
npm install lucide-react
npm install date-fns
```

### 1.2 Environment Variables Setup

Create `.env.local` file:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@zimystocks.com

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account_key.json

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Allowed users (comma-separated)
ALLOWED_USERS=matanpr@gmail.com,nevo40@gmail.com
```

---

## 2. Firebase Configuration

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `zimy-stocks`
4. Enable Google Analytics (optional)
5. Select existing GCP project or create new one

### 2.2 Enable Firebase Services

```bash
# Enable required Firebase services
firebase login
firebase init

# Select the following services:
# - Authentication
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Messaging
```

### 2.3 Configure Authentication

1. In Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Enable "Google" provider
4. Add authorized domains: `localhost`, `your-vercel-domain.vercel.app`

### 2.4 Set up Firestore Database

Create `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId
                        && request.auth.token.email in ['matanpr@gmail.com', 'nevo40@gmail.com'];
    }
    
    // Watchlists are user-specific
    match /watchlists/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId
                        && request.auth.token.email in ['matanpr@gmail.com', 'nevo40@gmail.com'];
    }
    
    // Alert rules are user-specific
    match /alert_rules/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId
                        && request.auth.token.email in ['matanpr@gmail.com', 'nevo40@gmail.com'];
    }
    
    // History is readable by authenticated users
    match /history/{company} {
      allow read: if request.auth != null 
                  && request.auth.token.email in ['matanpr@gmail.com', 'nevo40@gmail.com'];
      allow write: if false; // Only backend can write
    }
    
    // Signals are readable by authenticated users
    match /signals_latest/{company} {
      allow read: if request.auth != null 
                  && request.auth.token.email in ['matanpr@gmail.com', 'nevo40@gmail.com'];
      allow write: if false; // Only backend can write
    }
  }
}
```

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

### 2.5 Configure Cloud Messaging

1. In Firebase Console → Project Settings → Cloud Messaging
2. Generate Web Push certificates
3. Add VAPID key to environment variables

---

## 3. Google Cloud Platform Setup

### 3.1 Enable Required APIs

```bash
# Enable required GCP APIs
gcloud services enable run.googleapis.com
gcloud services enable scheduler.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

### 3.2 Create Service Accounts

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create zimy-stocks-runner \
    --display-name="Zimy Stocks Cloud Run Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member="serviceAccount:zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firestore.user"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member="serviceAccount:zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member="serviceAccount:zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Download service account key
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com
```

### 3.3 Store Secrets in Secret Manager

```bash
# Store OpenAI API key
echo -n "your_openai_api_key" | gcloud secrets create openai-api-key --data-file=-

# Store SendGrid API key
echo -n "your_sendgrid_api_key" | gcloud secrets create sendgrid-api-key --data-file=-

# Store Firebase admin SDK key
gcloud secrets create firebase-admin-key --data-file=service-account-key.json
```

---

## 4. BigQuery Configuration

### 4.1 Create Dataset

```bash
# Create BigQuery dataset
bq mk --location=US zimy_stocks
```

### 4.2 Create Tables

Create `earnings_events` table:

```bash
bq mk --table zimy_stocks.earnings_events \
company:STRING,ticker:STRING,expected_date:TIMESTAMP,market_index:STRING,sector:STRING,created_at:TIMESTAMP
```

Create `llm_outputs_history` table:

```bash
bq mk --table zimy_stocks.llm_outputs_history \
company:STRING,ticker:STRING,input_hash:STRING,sentiment:STRING,rationale:STRING,confidence:FLOAT,created_at:TIMESTAMP,tokens_used:INTEGER,cost_usd:FLOAT
```

---

## 5. Next.js Frontend Setup

### 5.1 Create Project Structure

```bash
mkdir -p src/components/ui
mkdir -p src/components/dashboard
mkdir -p src/components/auth
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/contexts
mkdir -p public/icons
```

### 5.2 Configure Firebase Client

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

export const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export default app;
```

### 5.3 Create Authentication Context

Create `src/contexts/AuthContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_USERS = ['matanpr@gmail.com', 'nevo40@gmail.com'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && ALLOWED_USERS.includes(user.email || '')) {
        setUser(user);
      } else if (user) {
        firebaseSignOut(auth);
        setUser(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!ALLOWED_USERS.includes(email)) {
      throw new Error('Access denied. Contact administrator.');
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    if (!ALLOWED_USERS.includes(result.user.email || '')) {
      await firebaseSignOut(auth);
      throw new Error('Access denied. Contact administrator.');
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 5.4 Create Main Layout

Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zimy Stocks - Earnings Intelligence',
  description: 'Smart earnings calendar with AI-powered insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 5.5 Create Service Worker for Push Notifications

Create `public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your_firebase_api_key",
  authDomain: "your_project.firebaseapp.com", 
  projectId: "your_project_id",
  storageBucket: "your_project.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

---

## 6. Cloud Run Backend Services

### 6.1 Create Data Fetcher Service

Create `backend/fetcher/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "index.js"]
```

Create `backend/fetcher/package.json`:

```json
{
  "name": "zimy-stocks-fetcher",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@google-cloud/firestore": "^6.8.0",
    "@google-cloud/bigquery": "^6.2.0",
    "@google-cloud/secret-manager": "^4.2.0",
    "axios": "^1.5.0"
  }
}
```

Create `backend/fetcher/index.js`:

```javascript
const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8080;

const firestore = new Firestore();
const bigquery = new BigQuery();
const secretManager = new SecretManagerServiceClient();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Earnings data fetcher endpoint
app.post('/fetch-earnings', async (req, res) => {
  try {
    console.log('Starting earnings data fetch...');
    
    // Fetch earnings data from external APIs
    // This is a placeholder - implement actual data source integration
    const earningsData = await fetchEarningsFromSources();
    
    // Store in BigQuery
    await storeInBigQuery(earningsData);
    
    // Store latest data in Firestore for quick access
    await storeInFirestore(earningsData);
    
    console.log(`Processed ${earningsData.length} earnings events`);
    res.status(200).json({ 
      message: 'Earnings data fetched successfully',
      count: earningsData.length 
    });
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    res.status(500).json({ error: 'Failed to fetch earnings data' });
  }
});

async function fetchEarningsFromSources() {
  // Placeholder for actual data fetching logic
  // Integrate with Yahoo Finance, Alpha Vantage, or other APIs
  const mockData = [
    {
      company: 'Apple Inc.',
      ticker: 'AAPL',
      expected_date: new Date('2024-01-25T16:30:00Z'),
      market_index: 'S&P500',
      sector: 'Technology',
      created_at: new Date()
    }
  ];
  
  return mockData;
}

async function storeInBigQuery(data) {
  const dataset = bigquery.dataset('zimy_stocks');
  const table = dataset.table('earnings_events');
  
  await table.insert(data);
}

async function storeInFirestore(data) {
  const batch = firestore.batch();
  
  data.forEach(event => {
    const docRef = firestore.collection('earnings_events').doc(`${event.ticker}_${event.expected_date.getTime()}`);
    batch.set(docRef, event);
  });
  
  await batch.commit();
}

app.listen(port, () => {
  console.log(`Fetcher service listening on port ${port}`);
});
```

### 6.2 Create Sentiment Scorer Service

Create `backend/scorer/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "index.js"]
```

Create `backend/scorer/package.json`:

```json
{
  "name": "zimy-stocks-scorer",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@google-cloud/firestore": "^6.8.0",
    "@google-cloud/bigquery": "^6.2.0",
    "@google-cloud/secret-manager": "^4.2.0",
    "openai": "^4.11.0",
    "crypto": "^1.0.1"
  }
}
```

Create `backend/scorer/index.js`:

```javascript
const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { OpenAI } = require('openai');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 8080;

const firestore = new Firestore();
const bigquery = new BigQuery();
const secretManager = new SecretManagerServiceClient();

let openai;

app.use(express.json());

// Initialize OpenAI client
async function initOpenAI() {
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/openai-api-key/versions/latest`,
  });
  
  const apiKey = version.payload.data.toString();
  openai = new OpenAI({ apiKey });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Sentiment scoring endpoint
app.post('/score-sentiment', async (req, res) => {
  try {
    console.log('Starting sentiment scoring...');
    
    if (!openai) {
      await initOpenAI();
    }
    
    // Get watchlisted companies
    const watchlistedCompanies = await getWatchlistedCompanies();
    
    // Get recent earnings events for these companies
    const earningsEvents = await getRecentEarningsEvents(watchlistedCompanies);
    
    let processedCount = 0;
    
    for (const event of earningsEvents) {
      // Check if we already have sentiment for this event
      const inputHash = generateInputHash(event);
      const existingAnalysis = await checkExistingAnalysis(inputHash);
      
      if (!existingAnalysis) {
        // Generate sentiment analysis
        const sentiment = await generateSentiment(event);
        
        // Store results
        await storeSentimentResults(event, sentiment, inputHash);
        processedCount++;
        
        // Rate limiting - max 50 calls per day
        if (processedCount >= 50) {
          console.log('Daily OpenAI quota reached');
          break;
        }
      }
    }
    
    console.log(`Processed sentiment for ${processedCount} companies`);
    res.status(200).json({ 
      message: 'Sentiment scoring completed',
      processed: processedCount 
    });
  } catch (error) {
    console.error('Error in sentiment scoring:', error);
    res.status(500).json({ error: 'Failed to score sentiment' });
  }
});

async function getWatchlistedCompanies() {
  const watchlistsSnapshot = await firestore.collection('watchlists').get();
  const companies = new Set();
  
  watchlistsSnapshot.forEach(doc => {
    const watchlist = doc.data();
    if (watchlist.companies) {
      watchlist.companies.forEach(company => companies.add(company));
    }
  });
  
  return Array.from(companies);
}

async function getRecentEarningsEvents(companies) {
  const events = [];
  const snapshot = await firestore.collection('earnings_events')
    .where('company', 'in', companies.slice(0, 10)) // Firestore 'in' limit
    .get();
    
  snapshot.forEach(doc => {
    events.push({ id: doc.id, ...doc.data() });
  });
  
  return events;
}

function generateInputHash(event) {
  const input = `${event.company}_${event.ticker}_${event.expected_date}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function checkExistingAnalysis(inputHash) {
  const snapshot = await bigquery
    .dataset('zimy_stocks')
    .table('llm_outputs_history')
    .getRows({
      query: `SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.zimy_stocks.llm_outputs_history\` WHERE input_hash = '${inputHash}' LIMIT 1`
    });
    
  return snapshot[0].length > 0 ? snapshot[0][0] : null;
}

async function generateSentiment(event) {
  const prompt = `Analyze the upcoming earnings report for ${event.company} (${event.ticker}) scheduled for ${event.expected_date}. 
  
  Consider:
  - Recent company performance
  - Market sector trends
  - Analyst expectations
  
  Provide a JSON response with:
  {
    "sentiment": "positive|neutral|negative",
    "confidence": 0.0-1.0,
    "rationale": "Brief explanation"
  }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.3
  });

  const content = response.choices[0].message.content;
  const tokensUsed = response.usage.total_tokens;
  
  try {
    const analysis = JSON.parse(content);
    return {
      ...analysis,
      tokens_used: tokensUsed,
      cost_usd: (tokensUsed / 1000) * 0.002 // Approximate cost calculation
    };
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      rationale: 'Failed to analyze',
      tokens_used: tokensUsed,
      cost_usd: (tokensUsed / 1000) * 0.002
    };
  }
}

async function storeSentimentResults(event, sentiment, inputHash) {
  // Store in BigQuery for historical tracking
  const bigqueryData = {
    company: event.company,
    ticker: event.ticker,
    input_hash: inputHash,
    sentiment: sentiment.sentiment,
    rationale: sentiment.rationale,
    confidence: sentiment.confidence,
    created_at: new Date(),
    tokens_used: sentiment.tokens_used,
    cost_usd: sentiment.cost_usd
  };
  
  await bigquery
    .dataset('zimy_stocks')
    .table('llm_outputs_history')
    .insert([bigqueryData]);
  
  // Store in Firestore for quick access
  await firestore
    .collection('signals_latest')
    .doc(event.ticker)
    .set({
      ...bigqueryData,
      last_updated: new Date()
    });
}

app.listen(port, () => {
  console.log(`Scorer service listening on port ${port}`);
});
```

### 6.3 Deploy Cloud Run Services

```bash
# Build and deploy fetcher service
cd backend/fetcher
gcloud run deploy zimy-stocks-fetcher \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT_ID

# Build and deploy scorer service  
cd ../scorer
gcloud run deploy zimy-stocks-scorer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT_ID
```

### 6.4 Set up Cloud Scheduler

```bash
# Create job to fetch earnings data daily
gcloud scheduler jobs create http fetch-earnings-job \
  --schedule="0 6 * * *" \
  --uri="https://zimy-stocks-fetcher-[hash]-uc.a.run.app/fetch-earnings" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="America/New_York"

# Create job to score sentiment twice daily
gcloud scheduler jobs create http score-sentiment-job \
  --schedule="0 8,18 * * *" \
  --uri="https://zimy-stocks-scorer-[hash]-uc.a.run.app/score-sentiment" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="America/New_York"
```

---

## 7. Notification Services

### 7.1 Set up SendGrid

1. Create SendGrid account and verify domain
2. Generate API key with full access
3. Store API key in Secret Manager (already done in step 3.3)

### 7.2 Create Notification Service

Create `backend/notifications/package.json`:

```json
{
  "name": "zimy-stocks-notifications",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@google-cloud/firestore": "^6.8.0",
    "@google-cloud/secret-manager": "^4.2.0",
    "@sendgrid/mail": "^7.7.0",
    "firebase-admin": "^11.10.1"
  }
}
```

Create `backend/notifications/index.js`:

```javascript
const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 8080;

const firestore = new Firestore();
const secretManager = new SecretManagerServiceClient();

// Initialize Firebase Admin
admin.initializeApp();

app.use(express.json());

// Initialize SendGrid
async function initSendGrid() {
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/sendgrid-api-key/versions/latest`,
  });
  
  const apiKey = version.payload.data.toString();
  sgMail.setApiKey(apiKey);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Send notifications endpoint
app.post('/send-notifications', async (req, res) => {
  try {
    console.log('Starting notification sending...');
    
    await initSendGrid();
    
    // Get users with their preferences
    const users = await getActiveUsers();
    
    let notificationsSent = 0;
    
    for (const user of users) {
      // Get user's watchlist
      const watchlist = await getUserWatchlist(user.id);
      
      if (watchlist && watchlist.companies.length > 0) {
        // Get upcoming earnings for watchlisted companies
        const upcomingEarnings = await getUpcomingEarnings(watchlist.companies);
        
        if (upcomingEarnings.length > 0) {
          // Send push notification
          await sendPushNotification(user, upcomingEarnings);
          
          // Send email if enabled
          if (user.preferences.emailNotifications) {
            await sendEmailNotification(user, upcomingEarnings);
          }
          
          notificationsSent++;
        }
      }
    }
    
    console.log(`Sent notifications to ${notificationsSent} users`);
    res.status(200).json({ 
      message: 'Notifications sent successfully',
      sent: notificationsSent 
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

async function getActiveUsers() {
  const snapshot = await firestore.collection('users').get();
  const users = [];
  
  snapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  
  return users;
}

async function getUserWatchlist(userId) {
  const doc = await firestore.collection('watchlists').doc(userId).get();
  return doc.exists ? doc.data() : null;
}

async function getUpcomingEarnings(companies) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const snapshot = await firestore.collection('earnings_events')
    .where('company', 'in', companies.slice(0, 10))
    .where('expected_date', '>=', today)
    .where('expected_date', '<=', tomorrow)
    .get();
    
  const events = [];
  snapshot.forEach(doc => {
    events.push({ id: doc.id, ...doc.data() });
  });
  
  return events;
}

async function sendPushNotification(user, earnings) {
  if (!user.fcmToken) return;
  
  const message = {
    token: user.fcmToken,
    notification: {
      title: 'Upcoming Earnings Alert',
      body: `${earnings.length} companies in your watchlist have earnings tomorrow`
    },
    data: {
      type: 'earnings_alert',
      count: earnings.length.toString()
    }
  };
  
  try {
    await admin.messaging().send(message);
    console.log(`Push notification sent to user ${user.id}`);
  } catch (error) {
    console.error(`Failed to send push notification to user ${user.id}:`, error);
  }
}

async function sendEmailNotification(user, earnings) {
  const earningsText = earnings.map(e => 
    `• ${e.company} (${e.ticker}) - ${e.expected_date.toLocaleDateString()}`
  ).join('\n');
  
  const msg = {
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@zimystocks.com',
    subject: 'Zimy Stocks - Upcoming Earnings Alert',
    text: `Hello,

You have ${earnings.length} companies in your watchlist with upcoming earnings:

${earningsText}

Visit your dashboard for detailed insights and recommendations.

Best regards,
Zimy Stocks Team`,
    html: `<h2>Upcoming Earnings Alert</h2>
           <p>You have ${earnings.length} companies in your watchlist with upcoming earnings:</p>
           <ul>
           ${earnings.map(e => `<li><strong>${e.company}</strong> (${e.ticker}) - ${e.expected_date.toLocaleDateString()}</li>`).join('')}
           </ul>
           <p><a href="https://your-domain.vercel.app/dashboard">Visit your dashboard</a> for detailed insights and recommendations.</p>`
  };
  
  try {
    await sgMail.send(msg);
    console.log(`Email notification sent to user ${user.email}`);
  } catch (error) {
    console.error(`Failed to send email to user ${user.email}:`, error);
  }
}

app.listen(port, () => {
  console.log(`Notifications service listening on port ${port}`);
});
```

### 7.3 Deploy Notifications Service

```bash
cd backend/notifications
gcloud run deploy zimy-stocks-notifications \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT_ID

# Create scheduler job for daily notifications
gcloud scheduler jobs create http send-notifications-job \
  --schedule="0 9 * * 1-5" \
  --uri="https://zimy-stocks-notifications-[hash]-uc.a.run.app/send-notifications" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="America/New_York"
```

---

## 8. CI/CD Pipeline

### 8.1 Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  GOOGLE_CLOUD_PROJECT: ${{ secrets.GOOGLE_CLOUD_PROJECT }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run lint
      run: npm run lint
    
    - name: Build project
      run: npm run build

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ secrets.GOOGLE_CLOUD_PROJECT }}
    
    - name: Deploy Fetcher Service
      run: |
        cd backend/fetcher
        gcloud run deploy zimy-stocks-fetcher \
          --source . \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated \
          --service-account zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
    
    - name: Deploy Scorer Service
      run: |
        cd backend/scorer
        gcloud run deploy zimy-stocks-scorer \
          --source . \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated \
          --service-account zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
    
    - name: Deploy Notifications Service
      run: |
        cd backend/notifications
        gcloud run deploy zimy-stocks-notifications \
          --source . \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated \
          --service-account zimy-stocks-runner@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
```

### 8.2 Configure GitHub Secrets

Add the following secrets to your GitHub repository:

```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GCP_SA_KEY=base64-encoded-service-account-key
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id  
VERCEL_PROJECT_ID=your-vercel-project-id
```

---

## 9. Monitoring and Observability

### 9.1 Set up Sentry

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure Sentry
npx @sentry/wizard -i nextjs
```

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 9.2 Set up Cost Monitoring

Create Cloud Function for cost monitoring:

```javascript
const { BigQuery } = require('@google-cloud/bigquery');
const sgMail = require('@sendgrid/mail');

exports.monitorCosts = async (req, res) => {
  const bigquery = new BigQuery();
  
  // Query OpenAI costs from BigQuery
  const [rows] = await bigquery.query(`
    SELECT SUM(cost_usd) as total_cost
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.zimy_stocks.llm_outputs_history\`
    WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  `);
  
  const monthlyCost = rows[0].total_cost || 0;
  
  if (monthlyCost > 3.0) { // Alert at $3 threshold
    await sgMail.send({
      to: 'matanpr@gmail.com',
      from: 'alerts@zimystocks.com',
      subject: 'Zimy Stocks - Cost Alert',
      text: `Monthly OpenAI costs have reached $${monthlyCost.toFixed(2)}. Current limit is $5.00.`
    });
  }
  
  res.status(200).json({ monthlyCost });
};
```

### 9.3 Set up Logging

Add to Cloud Run services:

```javascript
const { Logging } = require('@google-cloud/logging');
const logging = new Logging();
const log = logging.log('zimy-stocks');

// Log structured data
function logEvent(severity, message, data = {}) {
  const metadata = {
    resource: { type: 'cloud_run_revision' },
    severity: severity
  };
  
  const entry = log.entry(metadata, {
    message,
    ...data,
    timestamp: new Date().toISOString()
  });
  
  log.write(entry);
}
```

---

## 10. Security Configuration

### 10.1 Configure CORS

Add to all Cloud Run services:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-domain.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

### 10.2 Set up Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use(limiter);
```

### 10.3 Environment Security

Ensure all sensitive data is stored in Secret Manager and never in code:

```bash
# Audit secrets
gcloud secrets list

# Check IAM permissions
gcloud projects get-iam-policy $GOOGLE_CLOUD_PROJECT_ID
```

---

## 11. Cost Management

### 11.1 Set up Budget Alerts

```bash
# Create budget for the project
gcloud billing budgets create \
  --billing-account=$BILLING_ACCOUNT_ID \
  --display-name="Zimy Stocks Budget" \
  --budget-amount=50 \
  --threshold-rule=amount-type=ACTUAL_SPEND,threshold-percent=0.8 \
  --threshold-rule=amount-type=FORECASTED_SPEND,threshold-percent=1.0
```

### 11.2 Monitor OpenAI Usage

Add usage tracking to scorer service:

```javascript
// Track daily OpenAI usage
async function trackUsage(tokensUsed, cost) {
  const today = new Date().toISOString().split('T')[0];
  const usageRef = firestore.collection('usage_tracking').doc(today);
  
  await firestore.runTransaction(async (t) => {
    const doc = await t.get(usageRef);
    const current = doc.exists ? doc.data() : { tokens: 0, cost: 0, calls: 0 };
    
    t.set(usageRef, {
      tokens: current.tokens + tokensUsed,
      cost: current.cost + cost,
      calls: current.calls + 1,
      date: today
    });
  });
}
```

---

## 12. Testing and Validation

### 12.1 Create Test Scripts

Create `scripts/test-deployment.js`:

```javascript
const axios = require('axios');

async function testDeployment() {
  console.log('Testing deployment...');
  
  // Test Cloud Run services
  const services = [
    'https://zimy-stocks-fetcher-[hash]-uc.a.run.app/health',
    'https://zimy-stocks-scorer-[hash]-uc.a.run.app/health',
    'https://zimy-stocks-notifications-[hash]-uc.a.run.app/health'
  ];
  
  for (const service of services) {
    try {
      const response = await axios.get(service);
      console.log(`✅ ${service}: ${response.data.status}`);
    } catch (error) {
      console.log(`❌ ${service}: ${error.message}`);
    }
  }
  
  // Test Firebase connection
  try {
    const admin = require('firebase-admin');
    admin.initializeApp();
    await admin.firestore().collection('test').add({ timestamp: new Date() });
    console.log('✅ Firebase: Connected');
  } catch (error) {
    console.log(`❌ Firebase: ${error.message}`);
  }
}

testDeployment();
```

### 12.2 Run Tests

```bash
# Test backend services
node scripts/test-deployment.js

# Test frontend build
npm run build

# Test Firebase rules
firebase emulators:start --only firestore
npm run test:firestore-rules
```

### 12.3 Manual Validation Checklist

- [ ] Firebase Authentication with email restriction works
- [ ] Firestore security rules are properly configured
- [ ] Cloud Run services are accessible and healthy
- [ ] Cloud Scheduler jobs are created and enabled
- [ ] BigQuery tables exist and are accessible
- [ ] Secret Manager contains all required secrets
- [ ] Vercel deployment is successful
- [ ] Push notifications work in browser
- [ ] Email notifications are delivered
- [ ] Cost monitoring alerts are configured
- [ ] Error tracking with Sentry is active

---

## Post-Deployment Steps

1. **Domain Configuration**: Set up custom domain in Vercel
2. **DNS Configuration**: Point domain to Vercel
3. **SSL Certificate**: Ensure HTTPS is enabled
4. **Analytics Setup**: Configure user analytics if needed
5. **Performance Monitoring**: Set up Core Web Vitals tracking
6. **Backup Strategy**: Configure automated backups for Firestore
7. **Disaster Recovery**: Document recovery procedures

---

## Troubleshooting

### Common Issues

1. **Firebase Authentication fails**
   - Check allowed domains in Firebase Console
   - Verify environment variables
   - Check user email restrictions

2. **Cloud Run services not accessible**
   - Check IAM permissions
   - Verify service account configuration
   - Check network connectivity

3. **OpenAI API calls failing**
   - Verify API key in Secret Manager
   - Check quota limits
   - Review error logs in Cloud Logging

4. **Notifications not working**
   - Verify FCM setup and VAPID keys
   - Check SendGrid API key and domain verification
   - Review user preferences and tokens

### Debug Commands

```bash
# Check Cloud Run logs
gcloud logs read --resource=cloud_run_revision --limit=50

# Check Cloud Scheduler job status
gcloud scheduler jobs list

# Check Firebase rules
firebase firestore:rules:list

# Check BigQuery tables
bq ls zimy_stocks

# Test Secret Manager access
gcloud secrets versions access latest --secret="openai-api-key"
```

---

## Maintenance

### Regular Tasks

1. **Weekly**: Review error logs and fix issues
2. **Monthly**: Analyze cost reports and optimize
3. **Quarterly**: Update dependencies and security patches
4. **As needed**: Scale Cloud Run services based on usage

### Monitoring Dashboards

Set up Cloud Monitoring dashboards for:
- OpenAI API usage and costs
- Cloud Run service health and performance
- Firebase authentication and database usage
- Error rates and response times

---

This deployment guide covers all components needed for the Zimy Stocks Phase 1 MVP. Follow each section sequentially for a complete deployment.