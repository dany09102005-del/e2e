#!/bin/bash
# Quick API Testing Script
# Run these commands to test the face recognition system

API_URL="http://127.0.0.1:5000"

echo "🧪 Face Recognition API Test Commands"
echo "======================================="
echo ""

# Step 1: Get JWT Token
echo "1️⃣  Login to get JWT token:"
echo "curl -X POST $API_URL/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\": \"admin\", \"password\": \"admin\"}'"
echo ""

# Store token for later use
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Placeholder

# Step 2: Get Students
echo "2️⃣  Get registered students:"
echo "curl -X GET $API_URL/students \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""

# Step 3: Get Timetable
echo "3️⃣  Get class timetable:"
echo "curl -X GET $API_URL/timetable \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""

# Step 4: Get Violations
echo "4️⃣  Get recorded violations:"
echo "curl -X GET $API_URL/violations \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""

# Step 5: Register Student
echo "5️⃣  Register a new student (with 2+ images):"
echo "curl -X POST $API_URL/students \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -F \"student_id=23BQ1A0577\" \\"
echo "  -F \"name=New Student\" \\"
echo "  -F \"dept=CSE\" \\"
echo "  -F \"year=3\" \\"
echo "  -F \"images=@image1.jpg\" \\"
echo "  -F \"images=@image2.jpg\" \\"
echo "  -F \"images=@image3.jpg\""
echo ""

# Step 6: Match Face
echo "6️⃣  Detect bunk violation (match face):"
echo "curl -X POST $API_URL/match \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -F \"image=@captured_photo.jpg\" \\"
echo "  -F \"class=CSE-B1\""
echo ""

echo "📝 Response Example for /match:"
echo "{"
echo "  \"status\": \"success\","
echo "  \"match\": true,"
echo "  \"student_id\": \"23BQ1A0566\","
echo "  \"name\": \"Rahul Kumar\","
echo "  \"confidence\": 95.5,"
echo "  \"distance\": 0.045,"
echo "  \"timestamp\": \"2026-02-18T19:34:01\""
echo "}"
echo ""

echo "✨ All endpoints ready for testing!"
echo "📖 See SYSTEM_SUMMARY.md for detailed API documentation"
