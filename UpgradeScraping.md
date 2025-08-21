
Product Requirements Document (PRD)

Project: ZimyStocks
System Base: Node.js (existing AI-powered stock intelligence system)
Version: Phase 3 – Analyst & Earnings Integration

⸻

1. Background and Goals

Our system currently enriches stock data using AI agents, Serper (web search), and Polygon.io (financial data).
The next step is to provide analyst insights and earnings assessments so users can understand:
	•	What Wall Street expects for a company’s earnings (consensus EPS & revenue).
	•	How actual results compare against consensus once published.
	•	What analysts think about stock price targets and rating trends.
	•	The narrative around “beat vs miss” and sentiment shifts.

This enhancement transforms the system into a decision-support tool instead of just a data aggregator.

⸻

2. High-Level Architecture
	1.	Agents Layer
	•	Analyst Consensus Agent: Gathers EPS/revenue forecasts and price targets.
	•	Earnings Agent: Compares actual results vs consensus and generates a structured analysis.
	•	Sentiment Agent: Analyzes analyst commentary and news sentiment around earnings.
	2.	Data Sources
	•	Serper (for real-time analyst commentary, news, pre-earnings previews).
	•	Polygon.io MCP (for actual earnings release data, historical EPS, and fundamentals).
	•	Optional APIs:
	•	TipRanks, MarketWatch, or StockAnalysis (for aggregated analyst ratings & price targets).
	3.	Database Layer
	•	Extend schema to store consensus estimates, actuals, analyst ratings, and sentiment.
	4.	Presentation Layer
	•	Populate UI components with:
	•	Analyst forecast summary.
	•	Actual vs expected table.
	•	Sentiment score (Bullish / Neutral / Bearish).
	•	Long-term analyst consensus (Strong Buy / Hold / Sell).

⸻

3. Detailed Feature Requirements

3.1 Analyst Consensus Agent
	•	Inputs: Stock ticker (e.g., WMT).
	•	Outputs:
	•	Consensus EPS (range and average).
	•	Consensus revenue.
	•	Average 12-month price target & upside %.
	•	Analyst rating distribution (Buy/Hold/Sell).
	•	Implementation (Node.js):
	•	Query Serper: "Walmart earnings consensus FactSet Refinitiv site:barrons.com OR site:reuters.com OR site:marketwatch.com".
	•	Extract structured numbers via LLM parser (gpt-4.1-mini).
	•	Store results under stock.analyst_consensus.

⸻

3.2 Earnings Agent (Actual vs Expected)
	•	Inputs: Stock ticker, actual results from Polygon.io.
	•	Outputs:
	•	EPS vs estimate → Beat/Miss/Inline.
	•	Revenue vs estimate → Beat/Miss/Inline.
	•	Contextual note (“Raised guidance despite EPS miss”).
	•	Implementation:
	•	Use Polygon.io MCP’s get_earnings and get_snapshot_ticker.
	•	Compare against analyst consensus values in DB.
	•	Store results under stock.earnings_summary.

Example DB entry:

{
  "ticker": "WMT",
  "earnings_summary": {
    "revenue_expected": 176000000000,
    "revenue_actual": 177400000000,
    "revenue_result": "Beat",
    "eps_expected": 0.74,
    "eps_actual": 0.68,
    "eps_result": "Miss",
    "guidance": "Raised FY forecast",
    "updated_at": "2025-08-21T14:00:00Z"
  }
}


⸻

3.3 Sentiment Agent
	•	Inputs: News + analyst commentary (via Serper).
	•	Outputs: Sentiment classification and top analyst quotes.
	•	Implementation:
	•	Prompt gpt-4.1-mini with scraped headlines + quotes.
	•	Classify sentiment into Bullish / Neutral / Bearish.
	•	Store under stock.sentiment.

⸻

3.4 Database Schema Updates

Extend stocks collection/table with:

{
  "ticker": "WMT",
  "analyst_consensus": {
    "eps_estimate": 0.74,
    "revenue_estimate": 176000000000,
    "avg_price_target": 114.5,
    "rating": "Strong Buy",
    "distribution": {"buy": 35, "hold": 5, "sell": 2}
  },
  "earnings_summary": { ... },
  "sentiment": {
    "score": "Neutral",
    "top_quotes": ["Analysts remain confident but warn about valuation risks."]
  }
}


⸻

4. Non-Functional Requirements
	•	Freshness: Update consensus daily before earnings day, actual results within 5 minutes of release.
	•	Resilience: If external API fails, fallback to cached values with warning flag.
	•	Performance: Each agent run <10s total per stock.
	•	Security: Keep API keys (SERPER_API_KEY, POLYGON_API_KEY) in .env.
	•	Scalability: Must support 50–100 tracked stocks.

⸻

5. Deliverables
	1.	Node.js agents (Consensus Agent, Earnings Agent, Sentiment Agent).
	2.	Tool wrappers for Serper & Polygon MCP.
	3.	DB schema migrations.
	4.	API endpoints (e.g., /api/stocks/:ticker/analyst-insights).
	5.	UI components for:
	•	Consensus estimates.
	•	Earnings vs estimates comparison.
	•	Sentiment meter.


