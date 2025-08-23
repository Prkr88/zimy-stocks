# Gemini Context: Zimy Stocks

This document provides context for the Zimy Stocks project, a Next.js application designed for stock market analysis.

## Project Overview

Zimy Stocks is a web application that provides users with an earnings calendar, AI-powered insights, and alerts for stock market events. It is built with Next.js and leverages Firebase for its backend services.

### Key Features

*   **Earnings Calendar**: Displays upcoming earnings reports.
*   **AI-Powered Insights**: Utilizes OpenAI to generate sentiment analysis and summaries for stocks.
*   **Alerts**: Sends notifications to users about important stock events.
*   **User Management**: Firebase-based authentication and user management.

## System Architecture

Zimy Stocks is a full-stack Next.js application with a serverless backend hosted on Vercel and Firebase.

*   **Frontend**: The frontend is built with Next.js, React, and TypeScript. It uses Tailwind CSS for styling and is deployed on Vercel.
*   **Backend**: The backend is composed of Next.js API Routes and Firebase Functions. These handle data processing, AI agent orchestration, and communication with Firebase services.
*   **Database**: Firebase Firestore is the primary database for storing application data, including user information, watchlists, and earnings events. BigQuery is used for larger-scale data analysis.
*   **Authentication**: Firebase Auth provides a comprehensive authentication solution, supporting email/password and social logins.
*   **AI**: The application uses OpenAI's GPT-3.5-Turbo for sentiment analysis and LangChain for orchestrating AI agents.
*   **Deployment**: The frontend is deployed on Vercel, while backend jobs and functions are deployed on Google Cloud Run.
*   **CI/CD**: GitHub Actions are used for continuous integration and deployment, with workflows for deploying to Vercel and Google Cloud Run, as well as for running scheduled jobs.

## Core Components

This section provides an overview of the most important non-page components in the application.

### `src/lib/agents/orchestrator.ts`

*   **Purpose**: The `AgentOrchestrator` is the central coordinator for all AI agents in the system.
*   **Responsibilities**:
    *   Manages and runs agents for fetching news (SearchAgent), financial data (PolygonAgent), and earnings information (EarningsAgent).
    *   Provides methods for updating single tickers or batches of tickers.
    *   Includes logic for "smart" updates, which only update data that is considered stale.
    *   Logs metrics for agent usage and performance.

### `src/lib/services/earningsService.ts`

*   **Purpose**: This service is responsible for fetching and managing earnings data.
*   **Responsibilities**:
    *   Provides an abstraction layer for fetching earnings data from different sources (e.g., Alpha Vantage, mock data for development).
    *   Includes logic for normalizing and validating earnings data.
    *   The `createEarningsProvider` factory function returns the appropriate data provider based on the environment (production or development).

### `src/lib/services/sentimentService.ts`

*   **Purpose**: This service provides sentiment analysis for stocks.
*   **Responsibilities**:
    *   Uses OpenAI's GPT-3.5-Turbo to analyze the sentiment of news and other data related to a stock.
    *   Implements a caching mechanism to avoid re-analyzing the same data, which helps to reduce costs.
    *   Manages daily API usage to stay within budget.
    *   Provides a `batchCreateSentimentFromEarnings` function for efficiently analyzing multiple earnings events.

### `src/components/dashboard/EarningsGrid.tsx`

*   **Purpose**: This is the main UI component for displaying earnings events on the dashboard.
*   **Responsibilities**:
    *   Displays a grid of `EarningsCard` components.
    *   Provides functionality for filtering and sorting the earnings events.
    *   Handles the logic for adding and removing companies from the user's watchlist.
    *   Progressively loads and displays analyst ratings for the companies in the grid.

## Page Analysis

This section provides an overview of each page in the application and its responsibilities.

### `src/app/page.tsx`

*   **Purpose**: This is the main landing page of the application.
*   **Responsibilities**:
    *   If the user is authenticated, it redirects them to the `/dashboard` page.
    *   If the user is not authenticated, it displays a landing page with links to the main sections of the application: Dashboard, History, Alerts, and Login.

### `src/app/auth/page.tsx`

*   **Purpose**: Handles user authentication.
*   **Responsibilities**:
    *   Displays a login form for users to sign in.
    *   If the user is already authenticated, it redirects them to the `/dashboard` page.
    *   Uses the `AuthForm` component to handle the authentication logic.

### `src/app/dashboard/page.tsx`

*   **Purpose**: The main dashboard of the application.
*   **Responsibilities**:
    *   This page is protected and requires authentication.
    *   Fetches and displays upcoming earnings events, the latest sentiment signals, and the user's watchlists.
    *   Allows users to filter earnings events by market, sector, and search term using the `EarningsFilter` component.
    *   Displays the filtered earnings events in the `EarningsGrid` component.
    *   Provides functionality to add or remove companies from the user's watchlist.
    *   Includes a `FullSystemUpdateButton` to trigger a full system update.
    *   Displays a summary of analyst insights.

### `src/app/history/page.tsx`

*   **Purpose**: Displays the historical data for companies in the user's watchlist.
*   **Responsibilities**:
    *   This page is protected and requires authentication.
    *   Fetches and displays the history of earnings events, insights, and alerts for each company in the user's watchlist.
    *   Allows users to search for specific companies.
    *   Displays statistics about the tracked companies, total insights, and alerts sent.
    *   Uses the `CompanyCard` component to display the history for each company.

### `src/app/alerts/page.tsx`

*   **Purpose**: Allows users to manage their alert rules and notification settings.
*   **Responsibilities**:
    *   This page is protected and requires authentication.
    *   Displays a list of the user's alert rules.
    *   Allows users to create, update, and delete alert rules using the `AlertRuleCard` and `CreateAlertRuleModal` components.
    *   Provides a tab to manage notification settings using the `NotificationSettings` component.
    *   Displays a history of the alerts that have been sent to the user.

## Data Flow: Displaying the Earnings Calendar

1.  **User navigates to the dashboard**: The `DashboardPage` component is rendered.
2.  **Fetch initial data**: The `loadDashboardData` function is called, which fetches upcoming earnings events, sentiment signals, and user watchlists from Firestore in parallel.
3.  **Render the `EarningsGrid`**: The `EarningsGrid` component is rendered with the initial data.
4.  **Progressive loading of analyst ratings**: The `EarningsGrid` component fetches analyst ratings for the displayed companies in batches. This is done to avoid a long initial loading time.
5.  **User applies filters**: The user can filter the earnings events by market, sector, or search term. The `EarningsGrid` component re-renders with the filtered data.
6.  **User adds a company to their watchlist**: The `handleAddToWatchlist` function is called, which updates the user's watchlist in Firestore and updates the local state.

## Building and Running

### Prerequisites

*   Node.js (v18+)
*   Firebase Project
*   Google Cloud Project
*   OpenAI API Key

### Key Commands

*   **Installation**: `npm install`
*   **Development**: `npm run dev`
*   **Build**: `npm run build`
*   **Start Production Server**: `npm run start`
*   **Linting**: `npm run lint`
*   **Testing**: `npm run test`

## Development Conventions

*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Code Structure**:
    *   `src/app`: Next.js App Router pages and API routes.
    *   `src/components`: Reusable React components.
    *   `src/lib`: Core application logic, services, and utilities.
        *   `src/lib/agents`: AI agent implementations for data fetching and processing.
        *   `src/lib/services`: Business logic services.
    *   `src/types`: TypeScript type definitions.
*   **CI/CD**: The project uses GitHub Actions for continuous integration and deployment. Workflows are defined in the `.github/workflows` directory.
    *   `deploy.yml`: Handles deployment to Vercel and Google Cloud Run.
    *   `scheduled-jobs.yml`: Manages scheduled tasks like fetching earnings data and sending email summaries.
*   **AI Agents**: The application uses a set of AI agents to interact with external services like Polygon and Serper. The `AgentOrchestrator` class in `src/lib/agents/orchestrator.ts` is the central point for coordinating these agents.
