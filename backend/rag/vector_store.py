from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
import json
import os

import pandas as pd

try:
    import chromadb
    from chromadb import PersistentClient
    from chromadb.utils.embedding_functions import (
        SentenceTransformerEmbeddingFunction,
    )
except Exception as e:  # pragma: no cover
    chromadb = None
    PersistentClient = None
    SentenceTransformerEmbeddingFunction = None


# Defaults
_DEFAULT_PERSIST_DIR = os.getenv("RAG_CHROMA_DIR", "data/vector/chroma")
_DEFAULT_COLLECTION = os.getenv("RAG_COLLECTION", "agency_portfolio")
_DEFAULT_EMBED_MODEL = os.getenv(
    "RAG_EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
)


def _get_embedding_fn():
    if SentenceTransformerEmbeddingFunction is None:
        raise RuntimeError(
            "chromadb or sentence-transformers not installed. Please add to requirements."
        )
    return SentenceTransformerEmbeddingFunction(model_name=_DEFAULT_EMBED_MODEL)


def get_client(persist_dir: str | Path = _DEFAULT_PERSIST_DIR):
    if chromadb is None or PersistentClient is None:
        raise RuntimeError(
            "ChromaDB not available. Ensure chromadb is installed in backend environment."
        )
    persist_dir = Path(persist_dir)
    persist_dir.mkdir(parents=True, exist_ok=True)
    return PersistentClient(path=str(persist_dir))


def get_collection(
    client: Optional["PersistentClient"] = None,
    name: str = _DEFAULT_COLLECTION,
):
    client = client or get_client()
    emb_fn = _get_embedding_fn()
    # Use cosine space for better semantic similarity
    return client.get_or_create_collection(
        name=name, embedding_function=emb_fn, metadata={"hnsw:space": "cosine"}
    )


def _row_to_text(row: Dict[str, Any]) -> str:
    parts: List[str] = []
    # Support for Agency Listings Schema
    if "title" in row:
        parts.append(f"Title: {row['title']}")
    if "description" in row:
        parts.append(f"Description: {row['description']}")
    if "price" in row:
        parts.append(f"Price: {row['price']}")
    if "location" in row:
        parts.append(f"Location: {row['location']}")
    if "features" in row and isinstance(row["features"], list):
        parts.append(f"Features: {', '.join(row['features'])}")
    if "type" in row:
        parts.append(f"Type: {row['type']}")
    if "agent_notes" in row:
        parts.append(f"Agent Notes: {row['agent_notes']}")

    # Legacy Zameen Schema Support (Optional, can keep or remove)
    title = row.get("Short Desc") or row.get("title")
    long_desc = row.get("Long Desc") or row.get("full_description")
    location = row.get("Long Location") or row.get("Location")
    city = row.get("City")
    price_words = row.get("Price in words")

    if title and "Title:" not in parts[-1] if parts else True: # simplistic check to avoid dupes if keys overlap
         if title: parts.append(str(title))
    if long_desc and isinstance(long_desc, str) and "Description:" not in parts[-1] if parts else True:
         parts.append(str(long_desc))


    # Fallback if everything is empty
    if not parts:
        parts.append(json.dumps(row, ensure_ascii=False))
    return "\n".join(parts)


def _row_to_metadata(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract metadata from a row.
    We just copy everything that isn't the main text or too large, 
    so it's available in the frontend.
    """
    md: Dict[str, Any] = {}
    
    # keys we want to preserve in metadata
    keys_to_keep = [
        "id", "title", "price", "location", "city", "type", 
        "bedrooms", "baths", "area", "features", "agent_notes", "created_at"
    ]

    for k in keys_to_keep:
        if k in row and row[k] is not None:
            # ChromaDB requires metadata values to be str, int, float, or bool
            # It DOES NOT support lists directly in metadata usually (depending on version), 
            # but newer versions might. To be safe/compatible, if it's a list, we join it.
            val = row[k]
            if isinstance(val, list):
                val = ", ".join(str(v) for v in val)
            
            md[k] = val
            
    return md


def build_index_from_listings(
    listings: List[Dict[str, Any]],
    collection_name: str = _DEFAULT_COLLECTION,
    batch_size: int = 512,
) -> Tuple[int, str]:
    """
    Build or update a Chroma collection from a list of dictionaries.
    """
    client = get_client()
    # Reset collection if needed? For now we just get_or_create.
    # To truly 'replace', we might want to delete. But user said 'delete everything unnecessary', 
    # so maybe we should delete the previous collection content or delete the collection entirely first.
    # For safety in this refactoring, let's delete and recreate to ensure clean state.
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass # Collection might not exist

    col = get_collection(client, name=collection_name)

    ids: List[str] = []
    docs: List[str] = []
    metas: List[Dict[str, Any]] = []

    for i, row in enumerate(listings):
        rid = str(row.get("id", row.get("Property_Id", f"ag-{i}")))
        text = _row_to_text(row)
        meta = _row_to_metadata(row)

        # ChromaDB requires non-empty metadata dicts with no None values
        # Filter out None values and ensure at least one key exists
        meta = {k: v for k, v in meta.items() if v is not None}
        if not meta:
            meta = {"source": "seed"}

        ids.append(rid)
        docs.append(text)
        metas.append(meta)

        if len(ids) >= batch_size:
            col.add(ids=ids, documents=docs, metadatas=metas)
            ids, docs, metas = [], [], []

    if ids:
        col.add(ids=ids, documents=docs, metadatas=metas)

    count = col.count()
    return count, collection_name

def build_index_from_jsonl(
    corpus_path: str | Path = "data/processed/rag_corpus.jsonl",
    collection_name: str = _DEFAULT_COLLECTION,
    id_field_candidates: Iterable[str] = ("Property_Id", "id", "ID"),
    batch_size: int = 512,
) -> Tuple[int, str]:
    # Wrapper for legacy or file-based usage
    path = Path(corpus_path)
    if not path.exists():
         raise FileNotFoundError(f"{path} not found")
    
    data = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                data.append(json.loads(line))
            except:
                pass
    return build_index_from_listings(data, collection_name, batch_size)


def get_collection_stats(collection_name: str = _DEFAULT_COLLECTION) -> Dict[str, Any]:
    """
    Get statistics for the vector collection.
    """
    if chromadb is None:
        return {"status": "error", "message": "ChromaDB not installed"}
    
    try:
        client = get_client()
        # check if collection exists
        try:
            col = client.get_collection(name=collection_name)
        except Exception:
            return {"count": 0, "status": "empty"}
            
        count = col.count()
        return {
            "count": count,
            "status": "ready"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def query(
    query_text: str,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
    collection_name: str = _DEFAULT_COLLECTION,
) -> List[Dict[str, Any]]:
    client = get_client()
    col = get_collection(client, name=collection_name)

    where: Dict[str, Any] = {}
    if filters:
        # Map common filter keys to metadata fields
        city = filters.get("city") or filters.get("City")
        if city:
            where["city"] = city
        prop_type = (
            filters.get("property_type")
            or filters.get("Property Type")
            or filters.get("type")
        )
        if prop_type:
            where["property_type"] = prop_type
        min_price = filters.get("min_price")
        max_price = filters.get("max_price")
        if min_price is not None or max_price is not None:
            price_cond: Dict[str, Any] = {}
            if min_price is not None:
                price_cond["$gte"] = float(min_price)
            if max_price is not None:
                price_cond["$lte"] = float(max_price)
            where["price"] = price_cond
        min_beds = filters.get("min_bedrooms")
        if min_beds is not None:
            where["bedrooms"] = {"$gte": int(min_beds)}

    res = col.query(
        query_texts=[query_text],
        n_results=top_k,
        where=where or None,
        include=["documents", "metadatas", "distances"],
    )
    out: List[Dict[str, Any]] = []
    ids = res.get("ids", [[]])[0]
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0] or []

    for i, rid in enumerate(ids):
        dist = dists[i] if i < len(dists) else None
        score = (1.0 - float(dist)) if dist is not None else 0.0
        out.append(
            {
                "id": rid,
                "score": score,
                "text": docs[i] if i < len(docs) else "",
                "metadata": metas[i] if i < len(metas) else {},
            }
        )
    return out
