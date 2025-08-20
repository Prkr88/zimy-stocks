# Zimy Stocks Infrastructure Setup Guide

This guide will walk you through setting up all the required infrastructure for the Zimy Stocks Phase 1 MVP.

## 📋 Prerequisites

- Google account (for Firebase and GCP)
- GitHub account
- Vercel account
- OpenAI account
- SendGrid account (or Twilio SendGrid)
- Domain name (optional, for custom email)

## 🏗️ Infrastructure Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Authentication │    │   Database      │
│   (Vercel)      │────│   (Firebase)     │────│   (Firestore)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐                │
         └──────────────│   Cloud Run     │────────────────┘
                        │   (Jobs)        │
                        └─────────────────┘
                                 │
                   ┌─────────────────────────────┐
                   │                             │
         ┌─────────────────┐           ┌─────────────────┐
         │   OpenAI API    │           │   SendGrid      │
         │   (Sentiment)   │           │   (Email)       │
         └─────────────────┘           └─────────────────┘
```

## 1. 🔥 Firebase Setup

### Step 1.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Project name: `zimy-stocks`
4. Disable Google Analytics (optional for MVP)
5. Click "Create project"

### Step 1.2: Enable Authentication

1. In Firebase Console, go to **Authentication > Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Enable
   - **Google**: Enable and configure
3. Go to **Authentication > Settings > Authorized domains**
4. Add your domains:
   - `localhost` (for development)
   - Your Vercel domain (will get this later)
   - Your custom domain (if any)

### Step 1.3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (we'll update rules later)
4. Select location: `us-central` (or closest to your users)
5. Click "Enable"

### Step 1.4: Set Up Cloud Messaging

1. Go to **Project Settings > Cloud Messaging**
2. If you don't have a Web Push certificate, click "Generate key pair"
3. Save the **VAPID key** - you'll need this for `.env.local`

### Step 1.5: Get Firebase Configuration

1. Go to **Project Settings > General**
2. Scroll down to "Your apps"
3. Click "Web" icon to add a web app
4. App nickname: `zimy-stocks-web`
5. Don't enable Firebase Hosting
6. Copy the configuration object - you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "project.firebaseapp.com",  // NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "zimy-stocks",      // NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "project.appspot.com",   // NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789", // NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123:web:abc123"      // NEXT_PUBLIC_FIREBASE_APP_ID
};
```

### Step 1.6: Update Firestore Security Rules

1. Go to **Firestore Database > Rules**
2. Replace with the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Watchlists - users can only access their own
    match /watchlists/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Alert rules - users can only access their own
    match /alert_rules/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Alert history - users can only read their own
    match /alert_history/{document} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Earnings events - read-only for authenticated users
    match /earnings_events/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
    
    // Sentiment signals - read-only for authenticated users
    match /signals_latest/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
    
    // Company history - read-only for authenticated users
    match /company_history/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
    
    // OpenAI call logs - server only
    match /openai_calls/{document} {
      allow read, write: if false; // Only server can access
    }
    
    // Usage metrics - server only
    match /usage_metrics/{document} {
      allow read, write: if false; // Only server can access
    }
  }
}
```

3. Click "Publish"

## 2. ☁️ Google Cloud Platform Setup

### Step 2.1: Enable Required APIs

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Select your Firebase project (it should already exist)
3. Go to **APIs & Services > Library**
4. Enable the following APIs:
   - Cloud Run API
   - Cloud Scheduler API
   - Cloud Build API
   - Container Registry API
   - BigQuery API
   - Secret Manager API

### Step 2.2: Create Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click "Create Service Account"
3. Name: `zimy-stocks-service`
4. Description: `Service account for Zimy Stocks application`
5. Click "Create and Continue"
6. Grant the following roles:
   - Cloud Run Admin
   - Cloud Scheduler Admin
   - Cloud Build Editor
   - Storage Admin
   - BigQuery Admin
   - Secret Manager Admin
   - Firebase Admin
7. Click "Continue" then "Done"

### Step 2.3: Generate Service Account Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click "Add Key > Create new key"
4. Choose "JSON"
5. Download the JSON file - **Keep this secure!**
6. Save as `service-account-key.json` (don't commit to git)

### Step 2.4: Set Up BigQuery Dataset

1. Go to **BigQuery**
2. Click on your project ID in the left sidebar
3. Click "Create Dataset"
4. Dataset ID: `zimy_stocks`
5. Location: `US` (or same as Firestore)
6. Click "Create Dataset"

### Step 2.5: Create BigQuery Tables

Run these SQL commands in BigQuery:

```sql
-- Earnings events table
CREATE TABLE `zimy_stocks.earnings_events` (
  id STRING,
  ticker STRING,
  company_name STRING,
  expected_date TIMESTAMP,
  expected_time STRING,
  market STRING,
  sector STRING,
  quarter STRING,
  fiscal_year INT64,
  analyst_estimate FLOAT64,
  previous_earnings FLOAT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- LLM outputs history table
CREATE TABLE `zimy_stocks.llm_outputs_history` (
  id STRING,
  ticker STRING,
  input_hash STRING,
  prompt STRING,
  response STRING,
  tokens_used INT64,
  cost FLOAT64,
  created_at TIMESTAMP,
  result_used BOOLEAN
);
```

## 3. 🤖 OpenAI Setup

### Step 3.1: Create OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys**
4. Click "Create new secret key"
5. Name: `zimy-stocks-production`
6. Copy the API key - **Keep this secure!**

### Step 3.2: Set Usage Limits

1. Go to **Billing > Usage limits**
2. Set monthly limit: `$10` (for safety)
3. Enable email notifications at `$5`

## 4. 📧 SendGrid Setup

### Step 4.1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account
3. Verify your email address

### Step 4.2: Create API Key

1. Go to **Settings > API Keys**
2. Click "Create API Key"
3. Name: `zimy-stocks`
4. Permission: "Restricted Access"
5. Select permissions:
   - Mail Send: Full Access
   - Template Engine: Read Access
6. Click "Create & View"
7. Copy the API key - **Keep this secure!**

### Step 4.3: Verify Sender Identity

1. Go to **Settings > Sender Authentication**
2. Click "Verify a Single Sender"
3. Fill in your details (use a real email you control)
4. Click "Create"
5. Check your email and verify

### Step 4.4: Set Up Domain Authentication (Optional)

If you have a custom domain:
1. Go to **Settings > Sender Authentication**
2. Click "Authenticate Your Domain"
3. Follow the DNS setup instructions

## 5. 🚀 Vercel Setup

### Step 5.1: Create Vercel Account

1. Go to [Vercel](https://vercel.com/)
2. Sign up with your GitHub account

### Step 5.2: Connect GitHub Repository

1. Push your Zimy Stocks code to GitHub
2. In Vercel dashboard, click "Import Project"
3. Select your GitHub repository
4. Framework: "Next.js"
5. Root Directory: `./`
6. Don't deploy yet - we need to set environment variables first

### Step 5.3: Configure Environment Variables

In Vercel project settings, add these environment variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# API Keys
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender@domain.com

# Alpha Vantage (optional, for production earnings data)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
API_KEY=your_random_api_key_for_scheduled_jobs

# Google Cloud (for server-side operations)
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
```

### Step 5.4: Deploy to Vercel

1. Click "Deploy"
2. Wait for deployment to complete
3. Copy your Vercel URL (e.g., `https://zimy-stocks.vercel.app`)

### Step 5.5: Update Firebase Authorized Domains

1. Go back to Firebase Console
2. **Authentication > Settings > Authorized domains**
3. Add your Vercel domain

## 6. 🔄 GitHub Actions Setup

### Step 6.1: Set Up Repository Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

```bash
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Google Cloud Platform
GCP_SA_KEY=your_service_account_json_content
GCP_PROJECT_ID=your_gcp_project_id

# API Configuration
APP_URL=https://your-vercel-domain.vercel.app
API_KEY=your_random_api_key_for_scheduled_jobs
```

### Step 6.2: Get Vercel Tokens

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. **Settings > Tokens**
3. Create new token: `github-actions`
4. Copy the token

To get Org ID and Project ID:
```bash
npm i -g vercel
vercel login
vercel project ls
```

## 7. 🔐 Security Setup

### Step 7.1: Generate API Key for Scheduled Jobs

```bash
# Generate a random API key
openssl rand -hex 32
```

Save this as `API_KEY` in your environment variables.

### Step 7.2: Set Up Secret Manager (Optional)

For production, store sensitive data in GCP Secret Manager:

1. Go to **Secret Manager** in GCP Console
2. Create secrets for:
   - `openai-api-key`
   - `sendgrid-api-key`
   - `internal-api-key`

## 8. 📊 Monitoring Setup

### Step 8.1: Set Up Firebase Analytics (Optional)

1. Go to Firebase Console
2. **Analytics**
3. Enable Google Analytics
4. Follow setup instructions

### Step 8.2: Set Up Vercel Analytics

1. In Vercel project settings
2. Go to **Analytics**
3. Enable Web Analytics

## 9. 🧪 Testing the Setup

### Step 9.1: Local Development Test

1. Create `.env.local` with all environment variables
2. Run `npm run dev`
3. Test authentication with allowed emails
4. Test data refresh functionality
5. Test sentiment analysis (will use real OpenAI credits)

### Step 9.2: Production Deployment Test

1. Push code to main branch
2. Verify Vercel deployment
3. Test authentication in production
4. Test API endpoints
5. Verify Firebase data creation

### Step 9.3: Scheduled Jobs Test

1. Go to GitHub repository
2. **Actions > Scheduled Data Jobs**
3. Click "Run workflow"
4. Test each job type manually

## 10. 🎯 Final Checklist

### Firebase
- [ ] Project created and configured
- [ ] Authentication enabled (Email + Google)
- [ ] Firestore database created
- [ ] Security rules deployed
- [ ] Cloud Messaging configured
- [ ] VAPID key generated

### Google Cloud Platform
- [ ] Required APIs enabled
- [ ] Service account created with proper roles
- [ ] Service account key downloaded
- [ ] BigQuery dataset and tables created

### External Services
- [ ] OpenAI API key created and limits set
- [ ] SendGrid account verified
- [ ] Sender identity verified
- [ ] Domain authentication (if applicable)

### Deployment
- [ ] Vercel project configured
- [ ] Environment variables set
- [ ] GitHub Actions secrets configured
- [ ] Successful deployment to production

### Security
- [ ] Firestore security rules deployed
- [ ] API keys properly secured
- [ ] Authorized domains configured
- [ ] Internal API key generated

### Testing
- [ ] Local development working
- [ ] Production deployment working
- [ ] Authentication working
- [ ] Data refresh working
- [ ] Scheduled jobs working

## 🆘 Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check authorized domains in Firebase
   - Verify environment variables
   - Check browser console for errors

2. **Firestore permission denied**
   - Verify security rules
   - Check user authentication status
   - Ensure user document exists

3. **OpenAI API errors**
   - Check API key validity
   - Verify billing setup
   - Check usage limits

4. **Email not sending**
   - Verify SendGrid API key
   - Check sender verification
   - Review SendGrid activity logs

5. **Scheduled jobs not running**
   - Check GitHub Actions logs
   - Verify API_KEY environment variable
   - Test API endpoints manually

### Getting Help

- Firebase: [Firebase Support](https://firebase.google.com/support)
- Google Cloud: [GCP Support](https://cloud.google.com/support)
- Vercel: [Vercel Support](https://vercel.com/support)
- OpenAI: [OpenAI Help](https://help.openai.com/)
- SendGrid: [SendGrid Support](https://support.sendgrid.com/)

## 📝 Next Steps

After completing this setup:

1. **Monitor Costs**: Check OpenAI usage daily for the first week
2. **Test Alerts**: Add yourself to a watchlist and verify notifications
3. **Performance**: Monitor Vercel analytics and Firebase usage
4. **Backup**: Set up regular Firestore backups
5. **Documentation**: Keep this guide updated as you make changes

Your Zimy Stocks infrastructure is now ready for production! 🎉