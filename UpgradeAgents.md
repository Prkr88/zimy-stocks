
Product Requirements Document (PRD)

Project: ZimyStocks
System Base: Node.js (all agents, tools, and orchestration in Node.js)
Version: Phase 2 Upgrade

⸻

1. Background and Goals

The current system fetches and stores stock data in a basic way. We want to extend it into a more intelligent, agent-driven architecture that:
	•	Uses AI agents to dynamically fetch fresh stock data.
	•	Leverages Serper for real-time web search on financial news.
	•	Integrates Polygon.io as a structured financial data source via MCP.
	•	Updates the databases with this enriched, real-time information.
	•	Standardizes on gpt-4.1-mini for all agent reasoning tasks.

The ultimate goal is to enrich the stock data pipeline with fresh web insights and authoritative financial data, making the system more reliable for downstream components.

⸻

2. High-Level Architecture
	1.	Agents Layer
	•	Search Agent: Uses Serper to fetch latest stock news, announcements, or general market updates.
	•	Polygon Agent: Uses Polygon.io MCP adapter to fetch structured financial data (price, volume, fundamentals, etc).
	2.	Tools Layer
	•	Serper Tool: Wraps Serper API via LangChain’s GoogleSerperAPIWrapper.
	•	Polygon MCP Tool: Runs Polygon MCP server via MCPServerStdio, exposing tools like get_snapshot_ticker.
	3.	Database Integration
	•	Both agents feed their results into the system database.
	•	Fresh data updates existing stock records, ensuring each stock has:
	•	Market news/insights (from Serper).
	•	Real-time price & fundamentals (from Polygon).
	4.	Environment Configuration
	•	.env variables:

SERPER_API_KEY=xxxx
POLYGON_API_KEY=xxxx


	•	All agents use gpt-4.1-mini as their reasoning model.

⸻

3. Detailed Feature Requirements

3.1 Serper Integration (Web Search Agent)
	•	Objective: Fetch latest stock-related news for each ticker.
	•	Implementation:

import { GoogleSerperAPIWrapper } from "@langchain/community/utilities";
import { Tool } from "@langchain/core/tools";

const serper = new GoogleSerperAPIWrapper({ apiKey: process.env.SERPER_API_KEY });

const toolSearch = new Tool({
  name: "search",
  func: (query) => serper.run(query),
  description: "Fetches fresh web data for stocks and finance news"
});


	•	Agent Behavior:
	•	Query format: "<TICKER> latest news, earnings, market updates".
	•	Parse Serper output and update DB under stock.news.

⸻

3.2 Polygon Integration (Financial Data Agent)
	•	Objective: Fetch structured financial data for each ticker.
	•	Implementation:

import { MCPServerStdio } from "@modelcontextprotocol/sdk/server";
import { Agent, Runner } from "@openai/agents";

const params = {
  command: "uvx",
  args: ["--from", "git+https://github.com/polygon-io/mcp_polygon@v0.1.0", "mcp_polygon"],
  env: { POLYGON_API_KEY: process.env.POLYGON_API_KEY }
};

const instructions = "You answer questions about the stock market.";
const request = "What's the share price of AAPL? Use your get_snapshot_ticker tool to get the latest price.";

const model = "gpt-4.1-mini";

async function runPolygonAgent() {
  const server = new MCPServerStdio(params);
  const agent = new Agent({
    name: "polygon-agent",
    instructions,
    model,
    mcp_servers: [server]
  });

  const result = await Runner.run(agent, request);
  return result.final_output;
}


	•	Agent Behavior:
	•	Query format: "Get snapshot data for <TICKER>".
	•	Store structured results into DB under stock.price, stock.volume, stock.metrics.

⸻

3.3 Database Updates
	•	Schema Updates:
	•	Extend stock schema to include:

{
  "ticker": "AAPL",
  "price": 218.45,
  "volume": 12039480,
  "metrics": { ... },
  "news": ["Apple announces new iPhone...", "Earnings call scheduled..."],
  "last_updated": "2025-08-20T12:00:00Z"
}


	•	Update Flow:
	1.	Stock list →
	2.	Search Agent fetches news → DB update.
	3.	Polygon Agent fetches fundamentals → DB update.
	4.	Mark last_updated.

⸻

4. Non-Functional Requirements
	•	Performance: Each stock update cycle should complete in <5s (Serper) + <2s (Polygon).
	•	Reliability: Handle Serper or Polygon downtime gracefully (retry with exponential backoff, log failures).
	•	Security:
	•	Keep API keys in .env only.
	•	Never expose keys in frontend (NEXT_PUBLIC_* should not be used).
	•	Scalability: Agents should support batch stock updates (10+ tickers per cycle).

⸻

5. Deliverables
	1.	Agent definitions for Serper and Polygon.
	2.	Tool wrappers in Node.js for both services.
	3.	Database schema updates.
	4.	Integration scripts to run update cycles.
	5.	Unit tests:
	•	Serper fetch for mock ticker.
	•	Polygon snapshot fetch.
	•	DB update validation.


