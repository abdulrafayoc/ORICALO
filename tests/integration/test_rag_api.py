import pytest
from unittest.mock import patch

@pytest.mark.asyncio
async def test_rag_query_success(client):
    """Test RAG query endpoint with a successful mock response."""
    mock_results = [
        {
            "id": "1",
            "metadata": {"city": "Lahore", "price": 25000000},
            "document": "Beautiful 5 Marla house in Lahore",
            "distance": 0.1
        }
    ]
    
    with patch("app.api.endpoints.rag.query", return_value=mock_results):
        payload = {"query": "house in Lahore", "top_k": 1}
        resp = await client.post("/rag/query", json=payload)
        
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["id"] == "1"

@pytest.mark.asyncio
async def test_rag_query_error(client):
    """Test RAG query endpoint handling internal errors."""
    with patch("app.api.endpoints.rag.query", side_effect=Exception("Vector store connection failed")):
        payload = {"query": "error query"}
        resp = await client.post("/rag/query", json=payload)
        
        assert resp.status_code == 500
        assert "Vector store connection failed" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_rag_stats(client):
    """Test RAG stats endpoint."""
    mock_stats = {"count": 100, "dimension": 384}
    
    with patch("app.api.endpoints.rag.get_collection_stats", return_value=mock_stats):
        resp = await client.get("/rag/stats")
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 100
        assert data["dimension"] == 384

@pytest.mark.asyncio
async def test_rag_query_validation(client):
    """Test RAG query validation (missing required field)."""
    resp = await client.post("/rag/query", json={})
    assert resp.status_code == 422
