import requests
import json
import time

BASE_URL = "http://127.0.0.1:5001/api"

def test_backend():
    print("--- Starting Backend Verification ---")
    
    # 1. Register Student
    print("\n1. Testing Student Registration...")
    student_data = {
        "student_id": "STU001",
        "name": "Jane Doe",
        "program": "B.Tech",
        "batch": "2022-2026",
        "department": "CSE",
        "semester": 4,
        "section": "A",
        "mobile": "1234567890"
    }
    resp = requests.post(f"{BASE_URL}/students/", json=student_data)
    print(f"Status: {resp.status_code}, Body: {resp.json()}")
    assert resp.status_code == 201
    
    # 2. Get Students
    print("\n2. Testing Get Students...")
    resp = requests.get(f"{BASE_URL}/students/")
    students = resp.json()
    print(f"Status: {resp.status_code}, Count: {len(students)}")
    assert resp.status_code == 200
    assert any(s["student_id"] == "STU001" for s in students)
    
    # 3. Create Violation (Bunk)
    print("\n3. Testing Violation Creation (Bunk)...")
    violation_data = {
        "student_id": "STU001",
        "violation_type": "Bunk",
        "location": "A Block",
        "remarks": "Missed afternoon session"
    }
    resp = requests.post(f"{BASE_URL}/violations/", json=violation_data)
    print(f"Status: {resp.status_code}, Body: {resp.json()}")
    assert resp.status_code == 201
    
    # 4. Create Violation (Late Arrival)
    print("\n4. Testing Violation Creation (Late Arrival)...")
    violation_data = {
        "student_id": "STU001",
        "violation_type": "Late Arrival",
        "location": "B Block"
    }
    resp = requests.post(f"{BASE_URL}/violations/", json=violation_data)
    print(f"Status: {resp.status_code}")
    assert resp.status_code == 201
    
    # 5. Check Student Stats
    print("\n5. Checking Student Stats Update...")
    resp = requests.get(f"{BASE_URL}/students/")
    students = resp.json()
    student = next(s for s in students if s["student_id"] == "STU001")
    print(f"Stats: {student['stats']}")
    assert student["stats"]["total"] == 2
    assert student["stats"]["types"]["bunk"] == 1
    assert student["stats"]["types"]["late_arrival"] == 1
    
    # 6. Test Reports
    print("\n6. Testing Reports Analytics...")
    resp = requests.get(f"{BASE_URL}/reports/?group_by=violation_type")
    reports = resp.json()
    print(f"Violation Type Report: {reports}")
    assert reports["total"] == 2
    
    # 7. Test Invalid Violation
    print("\n7. Testing Invalid Violation Type...")
    invalid_data = {
        "student_id": "STU001",
        "violation_type": "Unknown",
        "location": "A Block"
    }
    resp = requests.post(f"{BASE_URL}/violations/", json=invalid_data)
    print(f"Status: {resp.status_code}, Message: {resp.json().get('error')}")
    assert resp.status_code == 400
    
    print("\n--- Verification Completed Successfully ---")

if __name__ == "__main__":
    try:
        test_backend()
    except Exception as e:
        print(f"\nVerification Failed: {e}")
