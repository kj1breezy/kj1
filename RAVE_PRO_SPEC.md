# RAVE Pro — Component Spec & Data Schema

This is the architecture reference for the "mission control" feature set: multi-asset watchlist with volume profile, multi-account fleet management, copy-trading drift, AI post-session auditing, voice journaling, and algorithmic risk guardrails. It covers every feature in the request. Each section is marked:

- **SHIPPED** — built and live in this update, 100% client-side (no server, no broker connection, no paid data feed)
- **ROADMAP** — genuinely needs infrastructure this app doesn't have (a backend, a broker/exchange API key, a paid market-data feed). Spec'd in full so it can be built the moment that infrastructure exists.

RAVE has no backend and no server by design — it's a static site (GitHub Pages) with all state in `localStorage`, optionally mirrored to your own Google Drive. That constraint is a feature (nothing about your trading ever touches a server you don't own) but it's also the hard limit on what "live" can mean here. Anywhere this doc says ROADMAP, the blocker is that constraint, not effort.

---

## 1. Multi-Asset Watchlist — Live Prices — **SHIPPED (v2) / ROADMAP (true tick-level volume profile)**

### What shipped
A `Watchlist` tab where you track a list of symbols (futures roots, stocks, or crypto pairs) and see **real live prices** for each — no API key, no backend. Quotes come from Yahoo Finance's public chart endpoint, fetched client-side and routed through the same CORS-relay fallback chain built for the Forex Factory macro calendar (tried direct first, then via `corsproxy.io`/`api.allorigins.win`). Each card shows the current price, today's change ($ and %), a small intraday sparkline, and an "as of" timestamp with a manual refresh button. Quotes are cached in memory for 90 seconds and are never persisted or synced — `state.quotes` is explicitly excluded from `buildSyncPayload()`, same as the AI auditor key.

v1 shipped a volume-profile chart built from your own logged fills instead of live prices; user feedback was that it duplicated information already visible elsewhere on the Dashboard, so it was replaced outright with live pricing (the actual "price of the indices" ask). Each card still shows a de-emphasized one-line summary of your own trade history on that symbol (count, net P&L, win rate) underneath the price.

### Data schema
```js
// state.watchlist — array, stored under LocalStore key 'watchlist'
{
  id: 'wl_...',
  symbol: 'ES',           // uppercased, matched against trade.symbol and mapped to a Yahoo ticker
  notes: '',              // free text — thesis, key levels, etc.
  addedAt: <ms epoch>,
  updatedAt: <ms epoch>,
  deleted: false
}

// state.quotes — runtime-only cache, keyed by mapped Yahoo ticker, NEVER persisted/synced
{ status: 'ok'|'loading'|'error', price, prevClose, change, changePct, points: [...], asOf: <ms epoch> }
```

### Component
- **Watchlist tab**: add/remove symbols, each rendered as a card.
- **Symbol card**: live price + today's change + intraday sparkline (`quoteBlock()`), a one-line trade-history summary, and any notes.
- Futures roots (ES, NQ, YM, RTY, CL, GC, SI, NG, ZB, ZN, ZF, HG, VIX) map to their Yahoo continuous-contract/index tickers; common crypto pairs (BTCUSD, ETHUSD, …) map to `-USD` tickers; anything else is passed through as-is (stocks/ETFs).
- The same quote fetcher (`ensureQuote`/`getQuote`/`sparklineSvg`) is reused by the Dashboard's HUD strip: the strip's four cells are Today's P&L, Trades Today, a live VIX reading + sparkline (`vixHudCell()` — replaced a duplicate on-device Rule Adherence % that was already shown in full on the Coach tab), and Max Drawdown (`maxDrawdownStats()`, shared with the Dashboard equity curve so the two numbers can't drift apart — replaced a daily-loss progress bar that moved into the risk-guardrail alert banner, see §6).

### Roadmap extension (needs infra)
- True volume-at-price overlay from exchange tape requires a paid, licensed market-data vendor (databento/Polygon/dxFeed-class) with a server-side key — CORS and licensing terms make this impossible to do honestly from a static page with no backend. Faking it with synthetic data would be actively misleading in a trading tool, so it's not shipped.
- Yahoo's public endpoint is undocumented/unofficial and could change or rate-limit without notice; if it becomes unreliable, a documented free-tier quote API (Finnhub, Twelve Data) with an optional user-supplied key would be the fallback, following the same opt-in pattern as the AI auditor key.

---

## 2. Multi-Account Management & Portfolio Sync — **SHIPPED**

RAVE already had a "Prop Firms" account model (firm, size, profit target, drawdown, daily loss, fees, payouts, per-trade `accountId` tagging). This update turns it into an actual fleet dashboard and extends the schema for payouts, drawdown type, and copy-trading roles.

### Data schema (extends the existing `account` object)
```js
// state.accounts — existing array, fields marked NEW added this update
{
  id: 'acc_...',
  firm: '', nickname: '', size: '', status: 'active'|'passed'|'funded'|'failed',
  profitTarget: '', maxDrawdown: '', dailyLoss: '', feesPaid: '', payouts: '',

  ddType: 'trailing'|'static',        // NEW — trailing = peak-to-trough (existing calc), static = vs starting balance
  profitSplit: '',                     // NEW — trader's % of profit, e.g. 80
  payoutSchedule: ''|'weekly'|'biweekly'|'monthly'|'on-demand',  // NEW
  nextPayoutDate: '',                  // NEW — ISO date
  minTradingDays: '',                  // NEW — firm's minimum active-day requirement
  role: 'independent'|'parent'|'slave', // NEW — for copy-trading drift (section 3)
  linkedParentId: '',                  // NEW — set when role === 'slave'

  updatedAt, deleted
}
```

### Component: Accounts table + Combined Equity chart (top of Accounts tab)
A balance-forward table (`accountsTable()`) is the primary view: one row per account with status, running balance, today's P&L, net P&L, drawdown buffer, and trade count, plus a combined-balance/today total in the header — built to make "how many accounts do I have and what's each one worth" answerable at a glance. Below it, `accountsEquityChart()` plots cumulative P&L for every account with trades (one line per account, fixed categorical color order, colorblind-validated for dark mode) plus a neutral dashed line for personal/untagged trades, each sequence-indexed like the Dashboard equity curve, with direct end-of-line labels (account name + net P&L). This replaced an earlier stat-grid "Fleet Summary" panel that duplicated numbers already visible in the table and per-account cards. Every account card below it still shows its own rules and meters, unchanged.

### Component: Payout & Milestone Roadmap (per account, shown for `funded`/`passed` accounts)
- Buffer above max drawdown: `maxDrawdown − trailingUsed` (or vs static balance if `ddType === 'static'`), shown as $ and %.
- Trading-day progress: `minTradingDays` vs distinct trading days logged on that account.
- Profit split estimate: `net × profitSplit / 100` — what a payout today would be worth.
- Next payout date + countdown, from `nextPayoutDate`.

### Open risk / "cumulative R across accounts"
RAVE logs completed trades, not open positions, so "open risk" is approximated as the sum of `plannedRisk` on trades logged today per account (a proxy for size currently being risked) rather than a live broker position feed — genuinely live open-position risk is a ROADMAP item (needs a broker API).

---

## 3. Copy-Trading Drift Monitor — **SHIPPED (manual-entry) / ROADMAP (live broker feed)**

### Why manual-entry, not live
True copy-trading drift (latency between a parent account's fill and a slave account's fill, tick-level) requires both accounts' execution data to arrive from a broker or copy-trading platform's API in real time. RAVE has no broker connections. What's shipped instead: when you log a trade against a **slave** account, you can optionally record what the **parent** account actually filled at and when — the same information you'd see in both platforms' fill logs — and RAVE computes and tracks the drift over time.

### Data schema (extends `trade`)
```js
{
  // ...existing trade fields...
  parentFillPrice: '',   // NEW — only shown/used when the trade's account has role==='slave'
  parentFillTime: ''      // NEW — HH:MM
}
```

### Component: Copy-Trade Drift table (bottom of Accounts tab)
Per slave account with a linked parent: average price drift (slave entry − parent fill, direction-adjusted), average latency in minutes (from `time` vs `parentFillTime`), and trade count with both fields filled in. Shown only when at least one slave account with data exists.

### Roadmap extension
Real-time drift alerts (flagging a slave fill the moment it exceeds a threshold) need a live broker webhook or polling connection — not possible from a static page with no backend to receive that webhook.

---

## 4. AI Agentic Post-Session Auditor — **SHIPPED (two tiers)**

### Tier 1 — Rule Adherence Scoring (A–F), rule-based, always on, no API key
You define structured rules once in Settings (max size, no-trade time window, "must set a stop / Planned Risk", disallowed mistake tags). Every trade is scored 0–100 against those rules and mapped to a letter grade; Coach shows the overall grade, the most common violation, and your worst-graded trades. This runs entirely on-device, same as the rest of Coach — no network call, no LLM, so it's instant and always available, but it can only check what you told it to check.

```js
// state.settings.tradingRules — NEW
{
  maxSize: '',                 // number, optional
  noTradeStart: '', noTradeEnd: '', // 'HH:MM', optional window to avoid
  requireStop: false,          // if true, missing Planned Risk is a violation
  forbiddenMistakes: []        // subset of MISTAKE_TAGS
}
```
```js
function gradeTrade(trade, rules) → { score: 0-100, grade: 'A'|'B'|'C'|'D'|'F', reasons: [string] }
```

### Tier 2 — Real LLM audit (beta, opt-in, uses your own Anthropic API key)
A "Run AI Audit" button in Coach sends a compact summary of your recent trades plus your written trading plan directly from your browser to Claude (`api.anthropic.com`), and shows back a graded, written audit — this is the literal "LLM evaluates your setup/entry/stops/emotions against your uploaded plan" feature from the request, actually wired to a real model.

**How the key is handled:** pasted into Settings, stored in `localStorage` only, on this device, under its own key — **deliberately excluded from the Drive sync payload** so it's never written anywhere but this browser. The call uses Anthropic's documented direct-browser-access header rather than going through any RAVE-run server, because there is no RAVE-run server. This is genuinely calling the real API with the real trade data you choose to send — read the on-screen disclaimer before turning it on.

```js
// state.settings.tradingPlan — free text, synced (not secret)
// separate LocalStore key 'aiApiKey' — NOT included in buildSyncPayload / Drive sync
```

**Caveats to know before using it:** this sends trade data (symbol, direction, size, P&L, tags, notes) to Anthropic's API using your key and their usage terms apply. Anthropic's direct-browser-access mode is intended for exactly this kind of personal/local tool, not production apps with other users, which fits RAVE's single-user model — but it does mean your key is visible to anyone with access to this browser/device. Don't use a key that's shared with anything sensitive.

### Tier 3 — deeper agentic pattern-mining — **ROADMAP**
"Your win rate on NQ drops from 68% to 29% after 11:30am following a red print" is a real, minable pattern, and RAVE's local Coach engine already does lighter versions of this (event-based, mistake-based, tilt-based detectors). A genuinely open-ended agent that free-explores your full history for arbitrary multi-factor patterns like the NQ example is far more compute than is reasonable to run in a browser on every page load; it's a good fit for a scheduled backend job (nightly, or on-demand with a spinner) once there's a backend to run it on.

---

## 5. Voice-to-Journal Rapid Logging — **SHIPPED**

A mic button next to the Notes field in the trade form. Click to start, the browser's built-in speech recognition (`SpeechRecognition` / `webkitSpeechRecognition`) transcribes live into the textarea as you talk, click again (or it auto-stops on a pause) to finish. 100% client-side, no audio ever leaves your device — the transcription happens in the browser engine itself, not a network call. Falls back to a clear "not supported in this browser" message on browsers without the API (notably: not reliably supported in Firefox or Safari on some platforms — Chrome/Edge are the reliable path).

```js
// no new schema — writes into the existing trade.notes field
```

---

## 6. Algorithmic Risk & Prop Drawdown Guardrails — **SHIPPED (soft) / ROADMAP (hard/live)**

RAVE logs trades after the fact — it doesn't sit in front of your broker's order flow, so it cannot literally block an order or force a cooldown the way an execution-side risk system would. What it can do, and does: read today's logged trades the moment you save one, and surface the same lockout conditions as a hard-to-miss warning (a "soft" circuit breaker) rather than a silent statistic buried in a chart.

### Data schema
```js
// state.settings.riskGuardrails — NEW
{
  maxConsecLossWindow: 30,   // minutes
  maxConsecLosses: 2,
  overfreqCount: 3,          // executions...
  overfreqWindow: 5,         // ...within this many minutes
  slippageThreshold: ''      // $ — optional
}
// state.settings.dailyLossLimit — $ — folded into the same alert feed (defaultGuardrails() merges it in)
```
```js
function riskAlerts(todaysTrades, guardrails) → [{ kind, message, severity }]
```

### Component
A red/amber alert banner at the top of the Dashboard whenever, among today's logged trades: 2 (configurable) max-loss trades landed within 30 (configurable) minutes of each other, more than 3 (configurable) trades were logged within any 5-minute window (the over-frequency/revenge-trading signal), a trade's slippage (see §7) exceeded your configured threshold, or today's net loss crossed 70%/100% of your configured daily loss limit. When triggered, logging another trade prompts an explicit "are you sure" confirmation instead of a plain silent save. (The daily-loss check previously lived as its own progress-bar cell in the Dashboard HUD strip — that cell was replaced with a live VIX reading, so the check moved here instead of being dropped.)

### Roadmap extension — real lockout
Actually disabling order entry the moment a rule trips requires sitting between you and your broker (a broker API / DOM integration), which is a different category of product than a journal — noted here so the distinction is explicit, not glossed over.

### Position Sizing Calculator — **SHIPPED**, part of this section
In the trade form: Contracts/Size × Tick Value ($) × Stop Distance (ticks) → $ risk, with an "Apply to Planned Risk" button that fills the existing Planned Risk field (which already drives R-multiple tracking). Exact math, no external data needed.

---

## 7. Execution Delta & Slippage Analysis — **SHIPPED (manual-entry) / ROADMAP (live fills)**

### Data schema (extends `trade`)
```js
{
  plannedEntryPrice: ''   // NEW — the price you intended to get filled at
  // slippage = (entry − plannedEntryPrice), direction-adjusted, computed on read — not stored
}
```

### Component
Optional field in the trade form. When set, slippage feeds the risk guardrail threshold check (§6) and is visible on the trade detail. A dedicated aggregate "Execution Quality" analytics panel (avg slippage $, worst-slippage trades, % adverse) is a natural v2 once enough trades carry the field — noted as a fast follow rather than roadmap, since the data model already supports it.

### Roadmap extension
Automatic slippage capture (no manual entry) needs the broker's actual order-routing timestamps and fill reports via API — the same broker-connection dependency as §3 and §6.

---

## Summary table

| Feature | Status |
|---|---|
| Watchlist — live prices (Yahoo Finance, no API key) | Shipped |
| True volume-at-price overlay from exchange tape | Roadmap (needs a paid, licensed data feed) |
| Accounts table + combined equity chart across accounts | Shipped |
| Payout & milestone roadmap (buffer, split, next payout) | Shipped |
| Copy-trading drift (manual parent/slave fill entry) | Shipped |
| Copy-trading drift (live broker feed) | Roadmap (needs broker API) |
| Rule Adherence A–F grading (rule-based) | Shipped |
| Real LLM session audit (your own API key) | Shipped (beta, opt-in) |
| Open-ended agentic pattern mining | Roadmap (needs backend compute) |
| Voice-to-journal | Shipped |
| Risk guardrail alerts (soft warnings) | Shipped |
| Hard execution lockout | Roadmap (needs broker integration) |
| Position sizing calculator | Shipped |
| Slippage capture + threshold alert | Shipped |
| Slippage analytics panel | Fast follow (data model ready) |
