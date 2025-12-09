from pydantic import BaseModel
from typing import Optional

class AgentBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    system_prompt: str
    is_active: bool = True

class AgentCreate(AgentBase):
    pass

class AgentRead(AgentBase):
    id: int

    class Config:
        from_attributes = True
