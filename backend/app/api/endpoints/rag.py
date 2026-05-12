from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from rag.vector_store import query, get_collection_stats

router = APIRouter(tags=["rag"])

class RagQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None

@router.post("/rag/query")
async def rag_query(request: RagQueryRequest):
    """Query the RAG vector store for relevant property listings."""
    try:
        results = query(
            query_text=request.query,
            top_k=request.top_k,
            filters=request.filters
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag/stats")
async def rag_stats():
    """Get statistics about the RAG vector store."""
    try:
        stats = get_collection_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
