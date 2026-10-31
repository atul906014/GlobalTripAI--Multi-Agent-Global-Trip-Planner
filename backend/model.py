from pydantic import BaseModel, Field
from typing import List, Optional,TypedDict,Annotated,Any
import operator
from langchain_core.messages  import AnyMessage  



class TravelRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None



class ApprovalRequest(BaseModel):
    thread_id: str = Field(min_length=1)
    approved: bool
    feedback: str =""  # Optional feedback field
    



class TravelState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    user_query: str
    flight_results: str
    hotel_results: str
    itinerary: str
    llm_calls: int
    # New budget + HITL state
    budget_results: str
    approval_request: str
    approved: bool
    human_feedback: str
    final_response: str

    # Supervisor + guardrail state
    guardrail_allowed: bool
    guardrail_reason: str
    selected_agents: list[str]
    trip_constraints: dict[str, Any]
    supervisor_reasoning: str


class ChatState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    draft_answer: str
    user_query: str
