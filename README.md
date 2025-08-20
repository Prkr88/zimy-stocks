# Zimy Stocks - Phase 1 MVP

A Next.js application providing earnings calendar visibility, OpenAI-powered insights, and alerts for stock market earnings events.

## Features

- **Earnings Calendar**: View upcoming earnings with filtering by market (S&P500, TA-125), sector, and company
- **AI-Powered Insights**: Cost-optimized OpenAI sentiment analysis for watchlisted companies
- **Smart Alerts**: Push notifications and email summaries for earnings events
- **Company History**: Track past events, insights, and alerts for followed companies
- **User Management**: Firebase authentication with email restrictions
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Firebase Functions
- **Database**: Firebase Firestore, BigQuery (for analytics)
- **Authentication**: Firebase Auth (Google + Email/Password)
- **Notifications**: Firebase Cloud Messaging, SendGrid
- **AI**: OpenAI GPT-3.5-turbo
- **Deployment**: Vercel (frontend), Google Cloud Run (jobs)
- **CI/CD**: GitHub Actions

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── history/           # Company history
│   └── alerts/            # Alert settings
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── history/           # History page components
│   └── alerts/            # Alert management components
├── lib/                   # Utilities and configurations
│   └── services/          # Business logic services
└── types/                 # TypeScript type definitions
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Firebase project
- Google Cloud Platform project
- OpenAI API key
- SendGrid account

### Environment Variables

Create a `.env.local` file based on `.env.local.example`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# API Keys
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Alpha Vantage (optional, for production earnings data)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_KEY=your_internal_api_key_for_scheduled_jobs
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/zimy-stocks.git
   cd zimy-stocks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project
   - Enable Authentication (Google and Email/Password)
   - Enable Firestore
   - Enable Cloud Messaging
   - Generate a VAPID key for FCM
   - Update Firebase configuration in `.env.local`

4. **Set up Google Cloud Platform**
   - Enable Cloud Run API
   - Enable Cloud Scheduler API
   - Set up service account with necessary permissions

5. **Configure Firestore Security Rules**
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
       }
       
       // Alert rules - users can only access their own
       match /alert_rules/{document} {
         allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
       }
       
       // Earnings events - read-only for authenticated users
       match /earnings_events/{document} {
         allow read: if request.auth != null;
       }
       
       // Sentiment signals - read-only for authenticated users
       match /signals_latest/{document} {
         allow read: if request.auth != null;
       }
       
       // Company history - read-only for authenticated users
       match /company_history/{document} {
         allow read: if request.auth != null;
       }
       
       // Alert history - users can only read their own
       match /alert_history/{document} {
         allow read: if request.auth != null && resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables to Vercel project settings
3. Deploy automatically on push to main branch

### Cloud Run Deployment

1. Build and push Docker image:
   ```bash
   docker build -t gcr.io/your-project/zimy-stocks .
   docker push gcr.io/your-project/zimy-stocks
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy zimy-stocks \
     --image gcr.io/your-project/zimy-stocks \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Usage

### User Access

Access is restricted to authorized email addresses:
- matanpr@gmail.com
- nevo40@gmail.com

### Key Features

1. **Dashboard**: View upcoming earnings with AI sentiment indicators
2. **Watchlists**: Add companies to track their earnings and get personalized insights
3. **AI Analysis**: Get cost-optimized sentiment analysis for watchlisted companies
4. **Alerts**: Configure push notifications and email summaries
5. **History**: Review past insights and their accuracy

### Cost Optimization

The application implements several cost optimization strategies:

- **OpenAI Usage**: Limited to 50 calls per day, only for watchlisted companies
- **Caching**: Deduplicates identical analysis requests
- **Smart Scheduling**: Batches API calls and respects rate limits
- **Monitoring**: Tracks token usage and costs

## Monitoring and Maintenance

### Cost Monitoring

- Daily usage metrics are tracked in Firestore
- OpenAI costs are calculated and monitored
- Alert triggers if monthly costs exceed $5

### Scheduled Jobs

GitHub Actions runs the following scheduled jobs:
- **6:00 AM UTC**: Fetch earnings data
- **7:00 AM UTC**: Run sentiment analysis
- **8:00 AM UTC**: Send daily email summaries
- **9:00 AM UTC (Sundays)**: Send weekly email summaries

### Logs and Monitoring

- Application logs via console.log (viewable in Vercel/Cloud Run)
- Error tracking with proper error handling
- Performance monitoring through built-in Next.js analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

All rights reserved to Matan Parker and Avishai Parker.

## Support

For issues and questions, contact the development team or create an issue in the repository.