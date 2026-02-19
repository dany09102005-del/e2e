#!/usr/bin/env python3
"""
Test the face matching endpoint and show detailed debug info.

Usage:
    python test_match.py <image_path>

Example:
    python test_match.py storage/training/23BQ1A0521.jpg
"""

import sys
import os
import json
import requests
from pathlib import Path

def test_match_endpoint(image_path, class_name="CSE-B1", location="Classroom A"):
    """Test the /match endpoint with an image."""
    
    print(f"\n{'='*70}")
    print(f"📸 TESTING FACE MATCH ENDPOINT")
    print(f"{'='*70}\n")
    
    # Check file exists
    if not os.path.exists(image_path):
        print(f"❌ ERROR: File not found: {image_path}")
        return False
    
    file_size = os.path.getsize(image_path)
    print(f"Image: {image_path}")
    print(f"Size: {file_size} bytes")
    print(f"Class: {class_name}")
    print(f"Location: {location}\n")
    
    # Check if backend is running
    api_url = "http://127.0.0.1:5000"
    try:
        response = requests.get(f"{api_url}/ping", timeout=2)
        if response.status_code != 200:
            print(f"⚠️  Backend not responding properly")
    except Exception as e:
        print(f"❌ ERROR: Backend not running!")
        print(f"   Start it with: python app.py")
        print(f"   Error: {e}\n")
        return False
    
    print("✓ Backend is running\n")
    
    # Get JWT token
    print("Step 1: Getting JWT token...")
    try:
        token_response = requests.post(
            f"{api_url}/auth/login",
            json={"username": "admin", "password": "admin"},
            timeout=5
        )
        
        if token_response.status_code != 200:
            print(f"❌ Authentication failed: {token_response.status_code}")
            print(f"   Response: {token_response.text}")
            return False
        
        token = token_response.json().get('token')
        print(f"✓ Got token: {token[:50]}...\n")
    except Exception as e:
        print(f"❌ Error getting token: {e}\n")
        return False
    
    # Test /match endpoint
    print("Step 2: Calling /match endpoint...")
    try:
        with open(image_path, 'rb') as f:
            files = {
                'image': f,
            }
            data = {
                'class': class_name,
                'location': location
            }
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            match_response = requests.post(
                f"{api_url}/match",
                files=files,
                data=data,
                headers=headers,
                timeout=30
            )
        
        print(f"Response Status: {match_response.status_code}\n")
        
        # Parse response
        try:
            result = match_response.json()
        except:
            print(f"❌ Invalid JSON response: {match_response.text}")
            return False
        
        # Print full response
        print("Response:")
        print(json.dumps(result, indent=2, default=str))
        print()
        
        # Analyze response
        success = result.get('success')
        matched = result.get('matched')
        confidence = result.get('confidence')
        distance = result.get('distance')
        error = result.get('error')
        
        print(f"{'='*70}")
        print(f"ANALYSIS:")
        print(f"{'='*70}")
        print(f"Success: {success}")
        print(f"Matched: {matched}")
        print(f"Confidence: {confidence}")
        print(f"Distance: {distance}")
        if error:
            print(f"Error: {error}")
        print()
        
        if matched:
            student = result.get('student', {})
            print(f"✅ MATCHED!")
            print(f"  Student ID: {student.get('student_id')}")
            print(f"  Name: {student.get('name')}")
            print(f"  Department: {student.get('dept')}")
            print(f"  Confidence: {confidence:.1f}%")
            print(f"  Distance: {distance:.4f}")
        else:
            print(f"⚠️  No match found")
            if error:
                print(f"  Reason: {error}")
        
        print()
        return True
        
    except requests.exceptions.ConnectError:
        print(f"❌ ERROR: Could not connect to backend")
        print(f"   Make sure Flask is running: python app.py\n")
        return False
    except Exception as e:
        print(f"❌ Error during match: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("\n📸 Face Match Test Tool\n")
        print("Usage: python test_match.py <image_path> [class] [location]\n")
        print("Examples:")
        print("  python test_match.py storage/training/23BQ1A0566.png")
        print("  python test_match.py captured_photo.jpg CSE-B1 'Classroom A'")
        print("\nMake sure:")
        print("  1. Backend is running: python app.py")
        print("  2. Image is in correct format")
        print("  3. Student is registered in database\n")
    else:
        image_path = sys.argv[1]
        class_name = sys.argv[2] if len(sys.argv) > 2 else "CSE-B1"
        location = sys.argv[3] if len(sys.argv) > 3 else "Classroom A"
        
        success = test_match_endpoint(image_path, class_name, location)
        sys.exit(0 if success else 1)
