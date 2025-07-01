#!/bin/bash

echo "=== Debug: Solo establecer claves primero ==="
curl -X POST http://localhost:3001/answers/localhost/8080 \
  -H "Content-Type: application/json" \
  -d '{
    "answer_keys": {
      "E001": ["A", "B", "C"]
    }
  }' | jq

echo -e "\n=== Debug: Test con examen súper simple (3 preguntas) ==="
curl -X POST http://localhost:3001/grade \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 8080,
    "exams": [
      {
        "student_id": "123",
        "exam_id": "E001",
        "answers": ["A", "B", "C"]
      }
    ]
  }' | jq

echo -e "\n=== Debug: Verificar formato enviado ==="
echo "El adapter debería enviar este JSON al cluster:"
echo '[{"stage":1,"id_exam":1,"answers":[{"qst_idx":1,"ans_idx":1},{"qst_idx":2,"ans_idx":2},{"qst_idx":3,"ans_idx":3}]}]'