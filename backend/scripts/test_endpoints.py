import httpx
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_auth():
    print("Testing /auth/login...")
    resp = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "demo@oricalo.com",
        "password": "demo1234"
    })
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Tokens received: {list(data.keys())}")
        return data["access_token"], data["refresh_token"]
    else:
        print(f"Error: {resp.text}")
        return None, None

def test_analytics_kpis():
    print("\nTesting /analytics/kpis...")
    resp = httpx.get(f"{BASE_URL}/analytics/kpis")
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"KPIs: {json.dumps(resp.json(), indent=2)}")
    else:
        print(f"Error: {resp.text}")

def test_rate_limiting():
    print("\nTesting rate limiting on /analytics/process_call...")
    for i in range(12):
        resp = httpx.post(f"{BASE_URL}/analytics/process_call", json={"history": []})
        print(f"Call {i+1}: {resp.status_code}")
        if resp.status_code == 429:
            print("✅ Rate limit triggered successfully!")
            break
        time.sleep(0.1)

if __name__ == "__main__":
    time.sleep(5) # Wait for server to start
    at, rt = test_auth()
    test_analytics_kpis()
    test_rate_limiting()
