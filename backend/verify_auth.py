import requests
import json

BASE_URL = "http://127.0.0.1:5001/api"

def test_auth():
    print("--- Starting Auth & RBAC Verification ---")
    
    # 1. Login with initial admin
    print("\n1. Testing Admin Login...")
    login_data = {"username": "admin", "password": "admin123"}
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200
    admin_token = resp.json()["access_token"]
    print("Login successful.")
    
    # 2. Create a staff user (Admin only)
    print("\n2. Testing User Creation (Staff)...")
    staff_data = {"username": "staff1", "password": "staffpassword", "role": "staff"}
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.post(f"{BASE_URL}/auth/create-user", json=staff_data, headers=headers)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 201
    print("Staff user created.")
    
    # 3. Login with staff
    print("\n3. Testing Staff Login...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "staff1", "password": "staffpassword"})
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200
    staff_token = resp.json()["access_token"]
    print("Staff login successful.")
    
    # 4. Access secured route (Staff accessing students)
    print("\n4. Testing Staff access to /students/")
    headers = {"Authorization": f"Bearer {staff_token}"}
    resp = requests.get(f"{BASE_URL}/students/", headers=headers)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 200
    print("Access granted.")
    
    # 5. Unauthorized access (No token)
    print("\n5. Testing Unauthorized access (No token)...")
    resp = requests.get(f"{BASE_URL}/students/")
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 401
    print("Access denied as expected.")
    
    # 6. Staff trying to create user (Forbidden)
    print("\n6. Testing Forbidden access (Staff creating user)...")
    headers = {"Authorization": f"Bearer {staff_token}"}
    resp = requests.post(f"{BASE_URL}/auth/create-user", json={"username": "hacker", "password": "123"}, headers=headers)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 403
    print("Access forbidden as expected.")

    print("\n--- Auth & RBAC Verification Completed Successfully ---")

if __name__ == "__main__":
    try:
        test_auth()
    except Exception as e:
        print(f"\nVerification Failed: {e}")
        import traceback
        traceback.print_exc()
