#!/bin/bash

# Test commands para ScoreHive Adapter
# Dirigidos a localhost:3001 (adapter) que se conecta a localhost:8080 (cluster)

echo "=== 1. ECHO Test - Verificar conectividad ==="
curl -X POST http://localhost:3001/echo/localhost/8080 \
  -H "Content-Type: application/json" \
  -d '{"message": "test connection"}' | jq

echo -e "\n\n=== 2. SET ANSWERS - Establecer claves de respuesta ==="
curl -X POST http://localhost:3001/answers/localhost/8080 \
  -H "Content-Type: application/json" \
  -d '{
    "answer_keys": {
      "E001": ["A", "B", "C", "D", "A"],
      "E002": ["B", "A", "D", "C", "B"],
      "E003": ["C", "D", "A", "B", "C"]
    }
  }' | jq

echo -e "\n\n=== 3. GET ANSWERS - Obtener claves de respuesta ==="
curl -X GET http://localhost:3001/answers/localhost/8080 \
  -H "Content-Type: application/json" | jq

echo -e "\n\n=== 4. GRADE - Evaluar exámenes ==="
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
      }
    ]
  }' | jq

echo -e "\n\n=== 5. REVIEW - Comando directo de evaluación ==="
curl -X POST http://localhost:3001/review/localhost/8080 \
  -H "Content-Type: application/json" \
  -d '{
    "exams": [
      {
        "student_id": "99999",
        "exam_id": "E001",
        "answers": ["A", "C", "B", "D", "A"]
      }
    ]
  }' | jq

echo -e "\n\n=== Tests completados ==="