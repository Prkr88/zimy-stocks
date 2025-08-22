
PRD - Analyst Credibility 

Goals
	•	Track each analyst’s Buy/Hold/Sell calls you ingest from your own pipelines.
	•	Measure outcomes over defined horizons vs benchmarks, then update an analyst credibility score.
	•	Expose an Analyst page showing profile, current score, history of calls, and per-call outcomes.
	•	All Node.js, integrates with your existing Polygon data and DB.

Core Concepts
	1.	Recommendation event

	•	What: Buy, Hold, Sell
	•	Optional: price target, confidence (0 to 1), horizon_days (default 90)
	•	Captured at timestamp T0 with reference price P0

	2.	Evaluation windows

	•	Evaluate each call at T0 + 7d, 30d, 90d (configurable). Start with 30d default.
	•	Fetch close or VWAP from Polygon at T1. Compute total return including dividends if you want later.

	3.	Outcome metric

	•	Absolute return: R = (P1 - P0) / P0
	•	Relative return (alpha): A = R - R_bench
	•	Benchmarks: SPY by default, or sector ETF per ticker (XLK for tech, XLY for consumer, etc.)
	•	Outcome rules at horizon:
	•	Buy is correct if A >= +2 percent
	•	Hold is correct if -1 percent < A < +1 percent
	•	Sell is correct if A <= -2 percent
	•	Otherwise neutral
	•	Thresholds are config and can include noise bands to avoid overfitting

	4.	Score update model

	•	Each analyst starts at 50. Range 0 to 100.
	•	Use an Elo-like update per evaluated call:
	•	Expected success probability E = 1 / (1 + 10^((50 - S)/20))
	•	Actual result outcome O in [0, 1]: correct = 1, neutral = 0.5, incorrect = 0
	•	Learning rate K depends on confidence and horizon, default K = 6
	•	New score S’ = S + K * (O - E)
	•	Recency weighting: only the most recent N=10 calls affect the displayed score directly, but keep a lifetime score for historical view.
	•	Decay: multiply K by freshness factor f = exp(-days_since_call / 180)

	5.	Credibility-weighted consensus

	•	When aggregating multiple analyst calls for a ticker, weight each by S’ normalized to [0.2, 1.0] so new analysts still count but strong ones count more.

Data Model (Postgres example)

-- analysts
create table analysts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  firm text,
  score numeric not null default 50,
  lifetime_calls int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- recommendations
create table analyst_recommendations (
  id uuid primary key default gen_random_uuid(),
  analyst_id uuid references analysts(id) not null,
  ticker text not null,
  action text not null check (action in ('BUY','HOLD','SELL')),
  confidence numeric check (confidence between 0 and 1),
  horizon_days int not null default 30,
  target_price numeric,
  note text,
  t0 timestamptz not null default now(),
  p0 numeric not null,
  benchmark text default 'SPY',
  status text not null default 'OPEN' -- OPEN, CLOSED
);

-- evaluations
create table analyst_evaluations (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references analyst_recommendations(id) not null,
  horizon_days int not null,
  t1 timestamptz not null,
  p1 numeric not null,
  bench_return numeric not null,
  abs_return numeric not null,
  alpha numeric not null,
  outcome text not null check (outcome in ('CORRECT','NEUTRAL','INCORRECT')),
  score_delta numeric not null,
  created_at timestamptz not null default now()
);

create index on analyst_recommendations (analyst_id, status);
create index on analyst_recommendations (ticker, status);

Ingestion and Evaluation Flow
	1.	Create a recommendation

	•	When your system detects an analyst note, normalize to a structured event.
	•	Fetch P0 via Polygon snapshots at creation time.

	2.	Scheduled evaluator (cron or queue worker)

	•	Every day, find OPEN recommendations where now() >= t0 + horizon_days.
	•	For each, fetch P1 and benchmark series from Polygon, compute returns and alpha.
	•	Classify outcome and update analyst score using the Elo-like rule.
	•	Mark recommendation as CLOSED and store an evaluation row.

	3.	Benchmarks

	•	Default SPY. Optionally map sector to ETF: XLK tech, XLY consumer discretionary, XLF financials, XLV health care, XLI industrials, XLE energy, XLU utilities, XLB materials, XLRE real estate, XLC communication services, XLP staples.

Node.js Implementation Sketch

Record a recommendation

import { Pool } from "pg";
import { type Shared } from "./types";
import { getPriceAt } from "./polygon";

export async function recordRecommendation(db: Pool, rec: {
  analystId: string;
  ticker: string;
  action: "BUY" | "HOLD" | "SELL";
  confidence?: number;
  horizonDays?: number;
  targetPrice?: number;
  note?: string;
  benchmark?: string;
}) {
  const p0 = await getPriceAt(rec.ticker, new Date()); // uses Polygon last close or snapshot
  const { rows } = await db.query(
    `insert into analyst_recommendations
     (analyst_id, ticker, action, confidence, horizon_days, target_price, note, p0, benchmark)
     values ($1,$2,$3,$4,coalesce($5,30),$6,$7,$8,coalesce($9,'SPY'))
     returning id`,
    [rec.analystId, rec.ticker, rec.action, rec.confidence ?? null, rec.horizonDays ?? null,
     rec.targetPrice ?? null, rec.note ?? null, p0, rec.benchmark ?? null]
  );
  return rows[0].id;
}

Daily evaluator

import { differenceInCalendarDays } from "date-fns";
import { getPriceOnClose } from "./polygon";
import { pool } from "./db";

function classifyOutcome(action: "BUY"|"HOLD"|"SELL", alpha: number) {
  const pos = 0.02, neg = -0.02, holdU = 0.01, holdL = -0.01;
  if (action === "BUY")  return alpha >= pos ? "CORRECT" : alpha <= neg ? "INCORRECT" : "NEUTRAL";
  if (action === "SELL") return alpha <= neg ? "CORRECT" : alpha >= pos ? "INCORRECT" : "NEUTRAL";
  return alpha > holdL && alpha < holdU ? "CORRECT" : "NEUTRAL";
}

function expected(score: number) {
  return 1 / (1 + Math.pow(10, (50 - score) / 20));
}

function outcomeValue(outcome: "CORRECT"|"NEUTRAL"|"INCORRECT") {
  return outcome === "CORRECT" ? 1 : outcome === "NEUTRAL" ? 0.5 : 0;
}

export async function runEvaluator(now = new Date()) {
  const { rows: open } = await pool.query(`
    select r.id, r.analyst_id, r.ticker, r.action, r.horizon_days, r.t0, r.p0, r.benchmark, a.score, r.confidence
    from analyst_recommendations r
    join analysts a on a.id = r.analyst_id
    where r.status = 'OPEN' and now() >= r.t0 + (r.horizon_days || ' days')::interval
  `);

  for (const r of open) {
    const t1 = new Date();
    const p1 = await getPriceOnClose(r.ticker, t1);
    const bench0 = await getPriceOnClose(r.benchmark, r.t0);
    const bench1 = await getPriceOnClose(r.benchmark, t1);

    const absReturn = (p1 - r.p0) / r.p0;
    const benchReturn = (bench1 - bench0) / bench0;
    const alpha = absReturn - benchReturn;

    const oc = classifyOutcome(r.action, alpha);
    const O = outcomeValue(oc);

    const days = differenceInCalendarDays(t1, new Date(r.t0));
    const freshness = Math.exp(-days / 180);
    const conf = r.confidence ?? 0.7;
    const K = 6 * freshness * (0.5 + 0.5 * conf);

    const E = expected(Number(r.score));
    const delta = K * (O - E);
    const newScore = Math.max(0, Math.min(100, Number(r.score) + delta));

    await pool.query('begin');
    await pool.query(`
      insert into analyst_evaluations
        (recommendation_id, horizon_days, t1, p1, bench_return, abs_return, alpha, outcome, score_delta)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [r.id, r.horizon_days, t1, p1, benchReturn, absReturn, alpha, oc, delta]);

    await pool.query(`
      update analysts
      set score = $1, lifetime_calls = lifetime_calls + 1, updated_at = now()
      where id = $2
    `, [newScore, r.analyst_id]);

    await pool.query(`update analyst_recommendations set status = 'CLOSED' where id = $1`, [r.id]);
    await pool.query('commit');
  }
}

Polygon helpers (sketch)

import { restClient } from "@polygon.io/client-js";
const polygon = restClient(process.env.POLYGON_API_KEY!);

export async function getPriceAt(ticker: string, when: Date) {
  // for simplicity use previous close if market not open
  const from = when.toISOString().slice(0,10);
  const { results } = await polygon.stocks.aggregates(ticker, 1, "day", from, from);
  if (!results?.length) throw new Error("No price data");
  return results[0].c;
}

export const getPriceOnClose = getPriceAt;

API Endpoints
	•	POST /api/analysts create or upsert an analyst profile
	•	POST /api/recommendations record a recommendation
	•	POST /api/evaluate admin trigger to run evaluator now
	•	GET /api/analysts/:id profile + score + last N calls + outcomes
	•	GET /api/analysts list with pagination, sortable by score, firm, lifetime_calls

Analyst Page UI

Top section
	•	Name, firm, current score, badge (Top Tier >= 80, Rising 65 to 79, New < 65 until 5 calls)
	•	Lifetime calls, win rate by action type

Tabs
	•	Calls: table with Date, Ticker, Action, Horizon, P0, P1, Alpha, Outcome
	•	Performance: charts over time of score and alpha distribution
	•	Notes: parsed highlights from their reports if available

Per call row chips
	•	Outcome chip: Correct, Neutral, Incorrect
	•	Benchmark chip: SPY or sector ETF used
	•	Confidence and horizon badges

Admin and Ops
	•	Feature flags: enable per ticker group
	•	Backfill switch is off by default since you do not want past data
	•	Alerts: notify if an analyst posts conflicting actions for the same ticker within 24h

Security and Constraints
	•	Store analyst identity as provided. If you cannot confidently disambiguate people with the same name, tag by firm + name + hash of source to avoid collisions.
	•	Do not expose raw notes if source has licensing constraints. Render your normalized action.

Configuration
	•	ENV
	•	POLYGON_API_KEY
	•	SCORE_K_BASE default 6
	•	OUTCOME_THRESHOLDS pos 0.02 neg -0.02 hold_upper 0.01 hold_lower -0.01
	•	DEFAULT_HORIZON_DAYS 30
	•	BENCHMARK_DEFAULT SPY

Testing Plan
	•	Unit tests for classifyOutcome with edge cases around thresholds
	•	Deterministic test of score update with fixed E, O, K
	•	Integration test hitting Polygon mock to evaluate a recommendation and assert DB updates
