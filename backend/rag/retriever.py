from typing import Any, Dict, List, Optional

from . import vector_store


def query_rag(query: str, top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    return vector_store.query(query_text=query, top_k=top_k, filters=filters or {})
