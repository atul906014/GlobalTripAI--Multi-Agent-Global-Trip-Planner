---
title: GlobalTrip AI
emoji: ✈️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# GlobalTrip AI

GlobalTrip AI is a travel-planning web application powered by a multi-agent workflow. It helps users plan trips by combining flight research, hotel suggestions, budget analysis, and itinerary generation into a single guided experience.

The project uses FastAPI for the backend, a lightweight HTML/JS frontend, and LangGraph-based AI agents for travel reasoning and orchestration.

## Features

- Trip planning using AI agents for flights, hotels, budgets, and itineraries
- Human-in-the-loop review before finalizing a trip plan
- Support for both trip-planning and general chat conversations
- Flight and hotel research using external tools
- Budget feasibility checks and practical cost guidance
- Markdown-rendered travel outputs in the web UI
- Thread-based conversation continuity using persisted state

## Tech Stack

- Python 3.10+
- FastAPI
- LangGraph
- LangChain
- Groq / Ollama model support
- PostgreSQL for LangGraph checkpoint persistence
- HTML, CSS, and JavaScript frontend
- Tavily and flight-search integrations

## Project Structure

```text
GlobalTripAI--Multi-Agent-Global-Trip-Planner/
├── backend/
│   ├── app.py
│   ├── planner.py
│   ├── requirements.txt
│   └── tools/
│       ├── __init__.py
│       ├── flight_tool.py
│       ├── news_tool.py
│       └── tavily_tool.py
├── frontend/
│   ├── static/
│   │   ├── script.js
│   │   └── style.css
│   └── template/
│       └── index.html
├── Dockerfile
├── README.md
└── .dockerignore
```

## Prerequisites

Before running the app, make sure you have:

- Python installed
- An optional PostgreSQL database URL for persistent conversation state
- A Groq API key, or a local Ollama model configuration
- Access to the required Python packages listed in `backend/requirements.txt`

## Installation

1. Open a terminal in the project root.
2. Create and activate a virtual environment:

```bash
python -m venv .venv
```

On Windows:

```powershell
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

3. Install the backend dependencies:

```bash
pip install -r backend/requirements.txt
```

## Environment Variables

Create a `.env` file in the `backend/` directory with values similar to the following. The run command below starts the application from that directory so `python-dotenv` can load the file.

```env
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
GROQ_API_KEY=your_groq_api_key
MODEL=llama-3.1-70b-versatile
TAVILY_API_KEY=your_tavily_api_key
AVIATIONSTACK_API_KEY=your_aviationstack_api_key

# Optional: use a local model instead of Groq
# use_local_model=true
# LOCAL_MODEL=qwen2.5-coder:7b
```

Notes:

- `GROQ_API_KEY` and `MODEL` are required when using Groq.
- `TAVILY_API_KEY` is needed for hotel/web search, and `AVIATIONSTACK_API_KEY` is needed for flight search.
- `DATABASE_URL` is optional. Without it, the app uses in-memory checkpoints and conversation state is lost when the app restarts.
- If `use_local_model=true`, the app will use the local Ollama model instead of Groq.
- If PostgreSQL is configured but unavailable, the app logs a warning and uses in-memory checkpoints.

## Deploy to Hugging Face Spaces

This repository is configured as a Docker Space and listens on port `7860`.

1. Create a new Space at [Hugging Face Spaces](https://huggingface.co/new-space) and select **Docker** as the Space SDK.
2. Add the repository files to the Space. You can connect your GitHub repository in the Space settings or push this repository to the Space's Git remote.
3. In **Settings → Variables and secrets**, add `GROQ_API_KEY` and `TAVILY_API_KEY` as secrets. The app requires both when it starts.
4. Set `MODEL` as a variable to a model ID currently supported by your Groq account.
5. Add `AVIATIONSTACK_API_KEY` as a secret to enable flight search.
6. For conversation state to survive restarts, add `DATABASE_URL` with an externally reachable PostgreSQL connection URL. Without it, the app uses in-memory checkpoints.
7. Wait for the Space build to finish, then open the Space URL.

Do not commit API keys or database credentials to the repository. Configure them as Space secrets. A Space restart clears in-memory conversation state; use PostgreSQL if persistent session state is required.

## Running the Application

From the project root, start the API server:

```bash
cd backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Then open the app in a browser:

```text
http://localhost:8000
```

## Application Flow

The backend workflow is organized around a multi-agent orchestration pattern:

1. A user submits a travel request.
2. The input guardrail checks whether the request is valid for travel planning.
3. A supervisor agent selects the required specialists.
4. Travel specialists fetch flight and hotel information, assess budget feasibility, and create a draft itinerary.
5. A human approval step is triggered before the final response is finalized.
6. Final output is sent back to the frontend as a travel plan or general chat answer.

## API Endpoints

### `GET /`
Returns the main travel planning UI.

### `POST /api/travel`
Generates a travel plan from a user prompt.

Example request body:

```json
{
  "message": "Plan a 5-day trip from Bangalore to Sikkim under 2 lakhs",
  "thread_id": "optional-thread-id"
}
```

### `POST /api/chat`
Handles general conversational requests outside the trip-planning workflow.

### `POST /api/travel/approve`
Accepts or rejects a drafted itinerary and optionally provides feedback.

### `GET /health`
Returns the health status for the API service.

## Frontend Overview

The frontend is served from `frontend/template/index.html` and uses JavaScript from `frontend/static/script.js` to:

- switch between trip-planning and general chat modes
- submit requests to the FastAPI backend
- render markdown results
- show approval/revision controls for itineraries
- copy and download travel plans

## Common Troubleshooting

- If the app fails to start, verify that your Python environment has all packages installed.
- If the app raises a missing environment variable error, confirm your `.env` file includes all required keys.
- If PostgreSQL connection fails, check the `DATABASE_URL` and SSL settings; the app will continue with in-memory checkpoints.
- If hotel or flight research fails, confirm the corresponding Tavily or Aviationstack secret is configured in the Space.
- If the model fails to initialize, confirm your Groq or Ollama configuration is valid.

## Notes

This project is intended for travel planning and travel information assistance. It can be extended with additional tools, airports, hotels, local database integrations, or richer user preferences.

You can continue improving the project by adding:

- better trip filtering and optimization logic
- richer hotel and flight data sources
- saved trip histories
- user authentication
- export options such as PDF/ICS/JSON
