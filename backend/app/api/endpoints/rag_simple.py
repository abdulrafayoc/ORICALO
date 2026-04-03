"""
Simple RAG endpoint that bypasses ChromaDB tenant issues
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sys
import os

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))

router = APIRouter(prefix="/rag", tags=["rag-simple"])

class RagQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None

class RagDocument(BaseModel):
    id: str
    score: float
    text: str
    metadata: Dict[str, Any]

class RagQueryResponse(BaseModel):
    query: str
    results: List[RagDocument]

@router.post("/query", response_model=RagQueryResponse)
async def rag_query_simple(payload: RagQueryRequest) -> RagQueryResponse:
    """Simple RAG endpoint that directly uses the working retriever"""
    try:
        # Import the retriever directly to avoid module caching issues
        from rag.retriever import query_rag
        
        print(f"🔍 Simple RAG Query: {payload.query}")
        results = query_rag(payload.query, top_k=payload.top_k, filters=payload.filters or {})
        print(f"✅ Simple RAG Success: {len(results)} results")
        
        docs: List[RagDocument] = []
        for r in results:
            docs.append(
                RagDocument(
                    id=str(r.get("id", "")),
                    score=float(r.get("score", 0.0)),
                    text=str(r.get("text", "")),
                    metadata=r.get("metadata") or {},
                )
            )
        return RagQueryResponse(query=payload.query, results=docs)
        
    except Exception as e:
        print(f"❌ Simple RAG Error: {e}")
        import traceback
        traceback.print_exc()
        
        # Return error document
        error_doc = RagDocument(
            id="error",
            score=0.0,
            text=f"Simple RAG Error: {str(e)}",
            metadata={"error": True},
        )
        return RagQueryResponse(query=payload.query, results=[error_doc])

@router.get("/stats")
async def rag_stats():
    """Get RAG collection statistics"""
    try:
        from rag.vector_store import get_collection_stats
        stats = get_collection_stats()
        return stats
    except Exception as e:
        return {"status": "error", "message": str(e)}
