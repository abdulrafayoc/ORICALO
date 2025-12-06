import requests
import json
import os

url = "http://localhost:8000/dialogue/step"

payload = {
    "history": [],
    "latest_transcript": "mujhe DHA mein 10 marla ghar chahiye",
    "metadata": {}
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=20)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
