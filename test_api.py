"""
Simple test script for ClassLens API
Run this after starting the server: uvicorn app.main:app --reload
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("🧪 Testing ClassLens API\n")
    
    # Test 1: Health check
    print("1. Testing health check...")
    response = requests.get(f"{BASE_URL}/")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
    
    # Test 2: Register a professor
    print("2. Registering professor...")
    professor_data = {
        "email": "prof@test.com",
        "password": "testpass123",
        "role": "professor"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=professor_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {response.json()}\n")
        professor_id = response.json().get("user_id")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    # Test 3: Register a student
    print("3. Registering student...")
    student_data = {
        "email": "student@test.com",
        "password": "testpass123",
        "role": "student"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=student_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {response.json()}\n")
        student_id = response.json().get("user_id")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    # Test 4: Login professor
    print("4. Logging in professor...")
    login_data = {
        "email": "prof@test.com",
        "password": "testpass123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        prof_token = response.json().get("access_token")
        print(f"   Token received: {prof_token[:20]}...\n")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    # Test 5: Create a class
    print("5. Creating a class...")
    class_data = {"name": "Test Class 101"}
    response = requests.post(
        f"{BASE_URL}/classes?professor_id={professor_id}",
        json=class_data
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        class_id = response.json().get("class_id")
        print(f"   Class ID: {class_id}\n")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    # Test 6: Create a lecture
    print("6. Creating a lecture...")
    lecture_data = {"class_id": class_id}
    response = requests.post(f"{BASE_URL}/lectures", json=lecture_data)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        lecture_id = response.json().get("lecture_id")
        print(f"   Lecture ID: {lecture_id}\n")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    # Test 7: Start lecture (get code)
    print("7. Starting lecture...")
    response = requests.post(f"{BASE_URL}/lectures/{lecture_id}/start")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        lecture_code = response.json().get("lecture_code")
        print(f"   Lecture Code: {lecture_code}\n")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    # Test 8: Student checks in
    print("8. Student checking in...")
    checkin_data = {"lecture_code": lecture_code}
    response = requests.post(
        f"{BASE_URL}/attendance/check-in?student_id={student_id}",
        json=checkin_data
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
    
    # Test 9: Create a question (manual)
    print("9. Creating a manual question...")
    question_data = {
        "lecture_id": lecture_id,
        "mode": "manual_full",
        "question_text": "What is 2+2?",
        "option_a": "3",
        "option_b": "4",
        "option_c": "5",
        "option_d": "6",
        "correct_answer": "b"
    }
    response = requests.post(
        f"{BASE_URL}/questions?professor_id={professor_id}",
        json=question_data
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        question_id = response.json().get("question_id")
        print(f"   Question ID: {question_id}\n")
    else:
        print(f"   Error: {response.text}\n")
        return
    
    print("✅ Basic API tests completed!")
    print(f"\n📝 Test Summary:")
    print(f"   Professor ID: {professor_id}")
    print(f"   Student ID: {student_id}")
    print(f"   Class ID: {class_id}")
    print(f"   Lecture ID: {lecture_id}")
    print(f"   Lecture Code: {lecture_code}")
    print(f"   Question ID: {question_id}")

if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server.")
        print("   Make sure the server is running: uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")

