# # Product Requirements Document (PRD) – Phase 1 MVP
**Product Name:** Zimy Stocks **Phase:** MVP – Phase 1 **Date:** August 25 **Version:** 1.1

# 1. Objective of Phase 1 (MVP)
The goal of Phase 1 is to deliver a minimal but functional product that provides **earnings calendar visibility, lightweight OpenAI-powered insights, and simple alerts** while staying within strict cost limits (under $5/month for OpenAI). The focus is on historical visibility and alerts, not live ticker analysis.

# 2. Scope of Phase 1
### Core Deliverables
**1** **Earnings Calendar**
	* Web interface displaying upcoming earnings releases.
	* Filtering options: index (S&P500, TA-125), sector, and company.
	* Basic details: company name, ticker, expected date/time, market index, sector.
**2** **OpenAI-based Insight (cost-optimized)**
	* Instead of per-ticker analysis, generate summaries/insights only for companies flagged in user watchlists.
	* Limit OpenAI calls to **a few dozen per day maximum** to stay under budget.
	* Outputs focus on sentiment classification and rationale **only for tracked companies**.
	* Store results for reuse – no duplicate calls for the same context.
	* Historical record is always shown (from Firestore/BigQuery) even if no new OpenAI call is made.
**3** **History Display for Suggested Stocks**
	* If a company was suggested (e.g., added to watchlist or previously alerted), show:
		* Historical earnings events.
		* Past OpenAI-generated insights (stored locally, not recalculated).
		* Past alerts sent.
	* No need for live ticker price streaming.
**4** **Alerts and Notifications**
	* Push notifications (Firebase Cloud Messaging).
	* Daily/weekly email summaries (SendGrid).
	* Alerts triggered **only** when:
		* A watchlist company has an upcoming earnings event.
		* An OpenAI-generated sentiment is available.
**5** **User Accounts and Preferences**
	* Firebase Auth (Google + Email/Password).
	* Firestore collections:
		* users – profile + preferences.
		* watchlists – list of companies the user follows.
		* alert_rules – user-defined notification settings.
		* history – past suggestions, insights, and alerts.
**6** **Web Application (Next.js on Vercel)**
	* Pages:
		* **Dashboard:** upcoming earnings with sentiment indicators.
		* **Company History:** previous events and insights.
		* **Alerts Settings:** configure alerts and email summaries.
	* Authentication integrated with Firebase.
	* Reads primarily from Firestore (signals, alerts, history).

⠀
# 3. Non-Goals (Phase 1)
* No full-scale ticker analysis for every stock in the market.
* No continuous live updates (focus is historical + scheduled jobs).
* No price target forecasting or advanced ML models.
* No broker or portfolio integrations.

⠀
# 4. System Architecture (Phase 1)
### Frontend
* **React + Next.js** on **Vercel**.
* Firebase SDK for Auth, Firestore, and FCM.(only 2 email should be allowed to login, matanpr@gmail.com and nevo40@gmail.com)
* Fetch historical data (earnings + insights) from Firestore and BigQuery.

⠀Backend
* **Cloud Run jobs** triggered via **Cloud Scheduler**:
  * **Data fetchers:** pull earnings calendars and analyst consensus (limited scope).
  * **Sentiment scorer:** only runs for watchlisted companies.
* Results stored in Firestore and BigQuery for reuse.

⠀Data Stores
* **Firestore**
  * signals_latest/{company} → latest sentiment + metadata.
  * history/{company} → list of past events, alerts, and insights.
  * users/{id}, watchlists, alert_rules.
* **BigQuery**
  * earnings_events – all normalized events.
  * llm_outputs_history – OpenAI outputs (stored for cost savings).

⠀Notifications
* **FCM** for push.
* **SendGrid** for email summaries.
* Notifications limited to watchlisted companies to stay cost-efficient.

⠀Observability
* Sentry for errors.
* Cloud Logging for ingestion/scoring jobs.
* Cost and token usage metrics tracked closely (alerts if >$3/month).

⠀
# 5. Data Flow (Phase 1)
**1** **Ingestion**
	* Scheduler triggers fetcher → writes normalized data to BigQuery + Firestore.
**2** **Sentiment Scoring (cost-optimized)**
	* Only run for watchlisted companies.
	* Deduplicate by hashing inputs.
	* Store results persistently (never re-call OpenAI unless new data).
**3** **History Tracking**
	* Every insight and alert saved in Firestore (history/{company}).
	* Dashboard shows both upcoming events and historical context.
**4** **Notifications**
	* Alerts generated only for watchlisted companies.
	* Push/email triggered from Firestore updates.

⠀
# 6. Success Criteria (Phase 1)
* Functional earnings calendar with filtering.
* Sentiment insights only for tracked companies (≤50 OpenAI calls/day).
* Historical insights visible for every suggested/alerted stock.
* Push + email notifications work reliably.
* Monthly OpenAI costs ≤ $5.

⠀
# 7. Engineering Tasks
### Frontend
* Build Dashboard with calendar + indicators.
* Build Company History page with past events + insights.
* Build Alerts Settings page.
* Integrate Firebase Auth, Firestore, FCM.

⠀Backend
* Implement Cloud Run fetcher for earnings events.
* Store results in Firestore + BigQuery.
* Implement Cloud Run scorer (watchlist only) → OpenAI API → Firestore/BigQuery.
* Implement deduplication + caching layer for OpenAI calls.

⠀Infrastructure
* Configure GitHub Actions CI/CD (Vercel + GCP).
* Add usage + cost monitoring.
* Secure secrets in GCP Secret Manager.

⠀
# 8. Legal Disclaimer
*This MVP is for informational purposes only. It does not provide licensed financial advice. All recommendations are generated using OpenAI APIs and third-party data sources, with strong cost and frequency limits.*

**All rights reserved to Matan Parker and Avishai Parker.**
