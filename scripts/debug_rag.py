import sys
import os
import traceback

sys.path.append(os.path.join(os.getcwd(), "backend"))

print("Attempting to import rag.retriever...")
try:
    from rag.retriever import query_rag
    print("Import successful.")
except Exception as e:
    print(f"Import failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("Attempting RAG query...")
try:
    results = query_rag("DHA Lahore")
    print(f"Query returned {len(results)} results.")
    print(results)
except Exception as e:
    print(f"Query failed: {e}")
    traceback.print_exc()
