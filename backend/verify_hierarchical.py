import requests
import json
import os

BASE_URL = "http://127.0.0.1:5001/api"

def test_hierarchical_detection():
    print("--- Starting Hierarchical Detection Verification ---")
    
    # 1. Login
    print("\n1. Logging in as Admin...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test Detection with Filters (CSE, A)
    # We use the same image that was used for training as a capture for testing
    image_path = "storage/training/CSE/A/23BQ1A0501/23BQ1A0501.jpeg"
    if not os.path.exists(image_path):
        print(f"Error: Test image {image_path} not found.")
        return

    print(f"\n2. Testing Detection with Filters (CSE, A)...")
    with open(image_path, "rb") as img_file:
        files = {"image": img_file}
        data = {"department": "CSE", "section": "A"}
        resp = requests.post(f"{BASE_URL}/detection/match", files=files, data=data, headers=headers)
        
    print(f"Status: {resp.status_code}")
    result = resp.json()
    print(f"Match Result: {json.dumps(result, indent=2)}")
    
    assert resp.status_code == 200
    assert result["matched"] == True
    assert result["student"]["student_id"] == "23BQ1A0501"
    
    # 3. Test Detection with Wrong Filters (ECE, A)
    print("\n3. Testing Detection with Wrong Filters (ECE, A) - Should not match...")
    with open(image_path, "rb") as img_file:
        files = {"image": img_file}
        data = {"department": "ECE", "section": "A"}
        resp = requests.post(f"{BASE_URL}/detection/match", files=files, data=data, headers=headers)
        
    print(f"Status: {resp.status_code}")
    result = resp.json()
    print(f"Result (Expected No Match): {result.get('message')}")
    assert result["matched"] == False

    print("\n--- Hierarchical Detection Verification Completed Successfully ---")

if __name__ == "__main__":
    try:
        test_hierarchical_detection()
    except Exception as e:
        print(f"\nVerification Failed: {e}")
        import traceback
        traceback.print_exc()
