import sys
from pathlib import Path
import json

# Ensure backend path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_dir))

from rag.retriever import query_rag

def test():
    query = "luxury villa in DHA"
    print(f"🔎 Querying: '{query}'")
    results = query_rag(query, top_k=3)
    
    print(f"✅ Found {len(results)} results:")
    for res in results:
        print("-" * 40)
        print(f"ID: {res['id']}")
        print(f"Score: {res['score']:.4f}")
        print(f"Metadata: {json.dumps(res['metadata'], indent=2)}")
        print(f"Text Snippet: {res['text'][:100]}...")

if __name__ == "__main__":
    test()
