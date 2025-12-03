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
_DEFAULT_COLLECTION = os.getenv("RAG_COLLECTION", "properties")
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
    title = row.get("Short Desc") or row.get("title")
    long_desc = row.get("Long Desc") or row.get("full_description")
    location = row.get("Long Location") or row.get("Location")
    city = row.get("City")
    price_words = row.get("Price in words")

    if title:
        parts.append(str(title))
    if long_desc and isinstance(long_desc, str):
        parts.append(str(long_desc))
    if location:
        parts.append(f"Location: {location}")
    if city:
        parts.append(f"City: {city}")
    if price_words:
        parts.append(f"Listed at: {price_words}")

    # Fallback if everything is empty
    if not parts:
        parts.append(json.dumps(row, ensure_ascii=False))
    return "\n".join(parts)


def _row_to_metadata(row: Dict[str, Any]) -> Dict[str, Any]:
    md: Dict[str, Any] = {}
    for k in [
        "City",
        "Province",
        "Property Type",
        "Location",
        "Bedrooms",
        "Baths",
        "Price",
        "Link",
    ]:
        if k in row and pd.notna(row[k]):
            md[k.lower().replace(" ", "_")] = row[k]
    return md


def build_index_from_jsonl(
    corpus_path: str | Path = "data/processed/rag_corpus.jsonl",
    collection_name: str = _DEFAULT_COLLECTION,
    id_field_candidates: Iterable[str] = ("Property_Id", "id", "ID"),
    batch_size: int = 512,
) -> Tuple[int, str]:
    """
    Build or update a Chroma collection from a JSONL corpus file.
    Returns: (num_indexed, collection_name)
    """
    corpus_path = Path(corpus_path)
    if not corpus_path.exists():
        raise FileNotFoundError(f"Corpus file not found: {corpus_path}")

    client = get_client()
    col = get_collection(client, name=collection_name)

    ids: List[str] = []
    docs: List[str] = []
    metas: List[Dict[str, Any]] = []

    with corpus_path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            try:
                row = json.loads(line)
            except Exception:
                continue

            rid = None
            for cand in id_field_candidates:
                if cand in row and row[cand] is not None and str(row[cand]).strip():
                    rid = str(row[cand])
                    break
            if rid is None:
                rid = f"rec-{i}"

            text = _row_to_text(row)
            meta = _row_to_metadata(row)

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
