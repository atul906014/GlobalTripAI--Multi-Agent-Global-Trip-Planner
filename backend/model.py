from pydantic import BaseModel, Field

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
    