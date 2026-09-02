# FlareAlign

**Live application**: https://cloudflare-agent.achyuthsuchit.workers.dev/

## About This Application

FlareAlign is an AI agent that helps a job candidate to prepare a job application. The agent runs on Cloudflare Workers and uses Cloudflare Workers AI for the language model (LLM).

The agent can:

- Compare a candidate profile with a job description and give a fit score.
- Write resume text for a specific job.
- Write STAR-method interview questions and answers.
- Start a multi-step workflow that processes a job application.

A user talks to the agent through a chat window that shows replies in real time.

## Technology

- **React** and **Vite**: the user interface.
- **Cloudflare Workers**: runs the agent code.
- **Cloudflare Durable Objects**: stores candidate, job, and score data.
- **Cloudflare Workflows**: runs the multi-step application workflow.
- **Cloudflare Workers AI**: runs the LLM.
- **TypeScript** and **Vitest**: the language and test tool.

## Requirements

- Node.js 24 or later.
- npm.
- A Cloudflare account.

## Setup

```
git clone https://github.com/Achyuth072/flarealign.git
cd flarealign
npm install
npx wrangler login
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Worker and UI on your computer. |
| `npm test` | Run the automated tests. |
| `npm run typecheck` | Check the TypeScript types. |
| `npm run build` | Build the UI and check types, for production. |
| `npm run deploy` | Deploy the application to Cloudflare Workers. |

## Project Structure

- `src/agent`: the AI agent code.
- `src/workflows`: the multi-step workflow code.
- `src/client`: the React user interface.
- `src/lib`: shared code, for example the fit-score calculation.
- `docs`: reference documents about the agent.

## Configuration

`wrangler.jsonc` sets the bindings this application needs: AI (the LLM), the Durable Object (agent storage), the Workflow, and Assets (the built UI files).

## Prompt History

[.scratch/Product/PROMPT-HISTORY.md](.scratch/Product/PROMPT-HISTORY.md) logs the prompts used to build this application.
