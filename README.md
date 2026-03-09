# cf_ai_willkerr - AI Research Agent

An AI-powered research assistant built on Cloudflare's developer platform. Uses a persistent **Durable Object** agent for conversation memory, **Cloudflare Workflows** for multi-step research coordination, and **Workers AI (Llama 3.3 70B)** for intelligence - all with a real-time streaming chat UI.

## Architecture

| Requirement | Implementation |
|---|---|
| **LLM** | Llama 3.3 70B via Workers AI (`@cf/meta/llama-3.3-70b-instruct`) |
| **Workflow / Coordination** | `ResearchWorkflow` - 3 chained steps with automatic retries |
| **User Input** | React chat UI + WebSocket streaming via Workers Assets |
| **Memory / State** | `ResearchAgent` Durable Object - SQL-backed conversation + research history |

## Features

- **Persistent chat** - Conversations survive page refreshes (Durable Object SQL)
- **Background research** - 3-step Workflow: generate questions -> research -> synthesize report
- **Automatic retries** - Each Workflow step retries up to 3 times on failure
- **Agent memory** - Remembers your name and all past research across sessions
- **Real-time streaming** - Responses stream over WebSocket as they are generated

## How the Workflow Works

When you ask the agent to research a topic, it triggers a `ResearchWorkflow` with three checkpointed steps:

1. **Generate Questions** - LLM generates 3 focused research questions
2. **Research** *(retries: 3)* - LLM answers all questions in depth
3. **Synthesize Report** - LLM writes: Executive Summary -> Key Findings -> Conclusion

If the Workflow fails mid-run, Cloudflare restarts from the last successful step automatically.

## Project Structure

```
cf_ai_willkerr/
  src/
    server.ts       # Worker entry - routes requests + serves assets
    agent.ts        # ResearchAgent (AIChatAgent + Durable Object + 5 tools)
    workflow.ts     # ResearchWorkflow (3-step pipeline with retries)
    types.ts        # Shared TypeScript interfaces
    client/
      App.tsx       # React chat UI
      App.css       # Styles
      main.tsx      # React entry point
  index.html
  vite.config.ts
  wrangler.toml     # Worker + DO + Workflow + AI + Assets config
  package.json
```

## Local Development

### Prerequisites

- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler authenticated: `npx wrangler login`

> Workers AI calls run on Cloudflare's servers even locally - internet + Cloudflare account required.

### Setup & Run

```bash
npm install
npm run dev
```

Opens two processes:
- `vite build --watch` - rebuilds React frontend on changes -> `dist/client/`
- `wrangler dev` - serves the Worker at `http://localhost:8787`

Open **http://localhost:8787** to use the app.

### Example Interactions

| What you type | What happens |
|---|---|
| `"My name is Alex"` | Agent stores your name in Durable Object state |
| `"Research quantum computing"` | Triggers a 3-step Cloudflare Workflow |
| `"Check my research"` | Polls Workflow status; returns report when complete |
| `"What topics have I researched?"` | Lists research history from Durable Object |
| `"Show me the quantum computing report"` | Retrieves stored report from memory |

## Deployment

```bash
npm run deploy
```

Builds the frontend then deploys to Cloudflare Workers. Live at:
`https://cf-ai-willkerr.<your-subdomain>.workers.dev`

## Cloudflare Platform Components

| Component | Role |
|---|---|
| **Workers AI** | Llama 3.3 70B for all LLM calls (no API key needed) |
| **Durable Objects** | `ResearchAgent` - per-user state, WebSocket connections |
| **Workflows** | `ResearchWorkflow` - multi-step research with retries + checkpointing |
| **Workers Assets** | Serves the compiled React frontend |
