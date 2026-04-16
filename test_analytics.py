import asyncio
import httpx

async def test():
    payload = {
        "history": [
            {"role": "user", "text": "Hi, I am looking for a 5 Marla house in DHA Phase 5."},
            {"role": "agent", "text": "Great! What is your budget?"},
            {"role": "user", "text": "My budget is around 2 crore. Can we arrange a visit tomorrow?"}
        ]
    }
    
    # Hit the local FastAPI analytics endpoint
    async with httpx.AsyncClient() as client:
        print("Sending Analytics process_call request...")
        resp = await client.post("http://127.0.0.1:8000/analytics/process_call", json=payload, timeout=20.0)
        
        print("\n=== Analytics Response ===")
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            import json
            print(json.dumps(resp.json(), indent=2))
        else:
            print(resp.text)

if __name__ == "__main__":
    asyncio.run(test())
