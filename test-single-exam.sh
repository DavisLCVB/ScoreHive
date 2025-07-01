#!/bin/bash

echo "=== Test con un solo examen ==="
curl -X POST http://localhost:3001/grade \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 8080,
    "exams": [
      {
        "student_id": "12345",
        "exam_id": "E001",
        "answers": ["A", "B", "C", "D", "A"]
      }
    ]
  }' | jq

echo -e "\n=== Test con 4 exámenes (uno por worker) ==="
curl -X POST http://localhost:3001/grade \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 8080,
    "exams": [
      {
        "student_id": "12345",
        "exam_id": "E001",
        "answers": ["A", "B", "C", "D", "A"]
      },
      {
        "student_id": "67890", 
        "exam_id": "E002",
        "answers": ["B", "A", "D", "C", "B"]
      },
      {
        "student_id": "11111",
        "exam_id": "E003", 
        "answers": ["C", "D", "A", "B", "C"]
      },
      {
        "student_id": "22222",
        "exam_id": "E004", 
        "answers": ["A", "A", "A", "A", "A"]
      }
    ]
  }' | jq