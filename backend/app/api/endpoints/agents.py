from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.session import get_db
from app.db_tables.agent import Agent
from app.schemas.agent import AgentCreate, AgentRead

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("/", response_model=List[AgentRead])
async def read_agents(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).offset(skip).limit(limit))
    agents = result.scalars().all()
    return agents

@router.post("/", response_model=AgentRead)
async def create_agent(agent: AgentCreate, db: AsyncSession = Depends(get_db)):
    db_agent = Agent(**agent.dict())
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

@router.get("/{agent_id}", response_model=AgentRead)
async def read_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).filter(Agent.id == agent_id))
    agent = result.scalars().first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=AgentRead)
async def update_agent(agent_id: int, agent_update: AgentCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).filter(Agent.id == agent_id))
    db_agent = result.scalars().first()
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    for key, value in agent_update.dict().items():
        setattr(db_agent, key, value)
    
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

@router.delete("/{agent_id}")
async def delete_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).filter(Agent.id == agent_id))
    db_agent = result.scalars().first()
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    await db.delete(db_agent)
    await db.commit()
    return {"ok": True}
