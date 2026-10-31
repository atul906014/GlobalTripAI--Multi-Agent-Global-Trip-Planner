from pathlib import Path
import traceback
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from model import TravelRequest, ChatRequest, ApprovalRequest
from planner import run_general_chat, run_travel_agent, resume_travel_agent
BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="GlobalTrip AI",
    description="LangGraph Multi-Agent Travel Planner with FastAPI Frontend",
    version="1.0.0"
)

app.mount(
    "/static",
    StaticFiles(
        directory=str(BASE_DIR.parent / "frontend" / "static")
    ),
    name="static"
)

templates = Jinja2Templates(
    directory=str(BASE_DIR.parent / "frontend" / "template")
)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.post("/api/travel")
async def travel_planner(request_data: TravelRequest):
    try:
        user_message = request_data.message.strip()

        if not user_message:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Message cannot be empty."
                }
            )
        



        result = run_travel_agent(
            user_input=user_message,
            thread_id=request_data.thread_id
        )

        return JSONResponse(
            content={
                "success": True,
                "thread_id": result["thread_id"],
                "answer": result["answer"],
                "flight_results": result["flight_results"],
                "hotel_results": result["hotel_results"],
                "itinerary": result["itinerary"],
                "llm_calls": result["llm_calls"],
                "requires_approval": result.get("requires_approval", False),
                "approval_request": result.get("approval_request", ""),
                "selected_agents": result.get("selected_agents", []),
                "trip_constraints": result.get("trip_constraints", {}),
                "supervisor_reasoning": result.get("supervisor_reasoning", ""),
                "guardrail_allowed": result.get("guardrail_allowed", True),
                "guardrail_reason": result.get("guardrail_reason", ""),
                "approved": result.get("approved"),
                "human_feedback": result.get("human_feedback", ""),
            }
        )

    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )


@app.post("/api/chat")
async def general_chat(request_data: ChatRequest):
    try:
        user_message = request_data.message.strip()

        if not user_message:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Message cannot be empty."},
            )

        result = run_general_chat(
            user_input=user_message,
            thread_id=request_data.thread_id,
        )

        return JSONResponse(
            content={
                "success": True,
                "thread_id": result["thread_id"],
                "answer": result["answer"],
            }
        )
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )



@app.post("/api/travel/approve")
async def approve_travel_plan(request_data: ApprovalRequest):
    try:
        if not request_data.approved and not request_data.feedback.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Please provide revision feedback when rejecting the draft.",
                },
            )

        result = resume_travel_agent(
            thread_id=request_data.thread_id,
            approved=request_data.approved,
            feedback=request_data.feedback,
        )

        return JSONResponse(
            content={
                "success": True,
                **result,
            }
        )

    except Exception as exc:
        print("APPROVAL ERROR:", exc)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(exc),
            },
        )



@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "TripMate AI API is running",
        "features": [
            "supervisor_agent",
            "input_guardrail",
            "human_in_the_loop",
        ],
    }


@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={})



@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={})



if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )