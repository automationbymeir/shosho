
import os
import sys
import asyncio
import httpx
from multiprocessing import Process
import time

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import uvicorn
from app.main import app

def run_server():
    print("Starting Uvicorn server...")
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

async def test_endpoint():
    print("Waiting for server to start...")
    await asyncio.sleep(5)  # Wait for server
    
    url = "http://127.0.0.1:8001/magic/create"
    payload = {
        "user_id": "test_user",
        "prompt": "Test Wedding",
        "max_pages": 5
    }
    
    print(f"Sending POST to {url}...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30.0)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("SUCCESS: Endpoint returned 200")
                data = response.json()
                print(f"Success Field: {data.get('success')}")
                # print(data)
                return True
            else:
                print(f"FAILURE: {response.text}")
                return False
        except Exception as e:
            print(f"EXCEPTION: {e}")
            return False

def verify_api():
    # Start server in a separate process
    server_process = Process(target=run_server)
    server_process.start()
    
    try:
        # Run async test client
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(test_endpoint())
        loop.close()
        
        if result:
            print("\nVERIFICATION PASSED")
            sys.exit(0)
        else:
            print("\nVERIFICATION FAILED")
            sys.exit(1)
            
    finally:
        server_process.terminate()
        server_process.join()

if __name__ == "__main__":
    verify_api()
