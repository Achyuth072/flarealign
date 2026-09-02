# FlareAlign

## About This Application

FlareAlign is an AI agent. The agent helps a job candidate to prepare a job application.

The agent runs on the Cloudflare Workers platform. The agent uses Cloudflare Workers AI to run a large language model (LLM).

The agent can do these tasks:

- The agent can compare a candidate profile with a job description. The agent gives a fit score for the job.
- The agent can write resume text for a specific job.
- The agent can write interview questions and answers. The agent uses the STAR method for these answers.
- The agent can start a multi-step workflow. The workflow processes a job application.

A user sends messages to the agent through a chat window. The chat window shows the agent's replies in real time.

## Technology in This Application

This application uses these technologies:

- **React**: the library for the user interface (UI).
- **Vite**: the build tool for the UI.
- **Cloudflare Workers**: the platform that runs the agent code.
- **Cloudflare Durable Objects**: the storage for candidate data, job data, and score data.
- **Cloudflare Workflows**: the tool that runs the multi-step application workflow.
- **Cloudflare Workers AI**: the service that runs the LLM.
- **TypeScript**: the programming language for this application.
- **Vitest**: the tool for the automated tests.

## Requirements

You must have these items before you install this application:

- Node.js, version 24 or a later version.
- npm, the Node.js package manager.
- A Cloudflare account.

## Installation Steps

Do these steps to install this application:

1. Open a terminal window.
2. Go to the project directory.
3. Type this command to install the packages:

   ```
   npm install
   ```

4. Type this command to log in to your Cloudflare account:

   ```
   npx wrangler login
   ```

## How to Start the Application on Your Computer

Type this command to start the application:

```
npm run dev
```

This command starts the Worker and the UI on your computer. Open the URL in the terminal output to see the application.

## How to Test the Application

Type this command to run the automated tests:

```
npm test
```

## How to Check the Code Types

Type this command to check the TypeScript code types:

```
npm run typecheck
```

## How to Build the Application

Type this command to build the application for production use:

```
npm run build
```

This command builds the UI files. This command also checks the code types.

## How to Deploy the Application

Type this command to deploy the application to Cloudflare Workers:

```
npm run deploy
```

## Project Structure

This list shows the main directories in this project:

- `src/agent`: the code for the AI agent.
- `src/workflows`: the code for the multi-step workflow.
- `src/client`: the code for the React user interface.
- `src/lib`: shared code, for example the fit-score calculation.
- `docs`: reference documents about the agent.

## Configuration File

The file `wrangler.jsonc` has the configuration for this application. This file sets these bindings:

- The AI binding, for the LLM.
- The Durable Object binding, for the agent's storage.
- The Workflow binding, for the multi-step workflow.
- The Assets binding, for the built UI files.
