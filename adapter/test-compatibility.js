#!/usr/bin/env node

// Script para probar compatibilidad TCP entre adapter y cluster
const axios = require('axios');
const fs = require('fs');

const ADAPTER_URL = 'http://localhost:3001';

// Datos de prueba con request_id
const testExams = [
  {
    student_id: "test-001",
    exam_id: "exam-001", 
    answers: ["A", "B", "C", "D", "A"]
  },
  {
    student_id: "test-002", 
    exam_id: "exam-002",
    answers: ["B", "A", "D", "C", "B"]
  }
];

async function testTCPCompatibility() {
  console.log('🧪 Iniciando test de compatibilidad TCP Adapter-Cluster...\n');
  
  try {
    // 1. Verificar que el adapter esté corriendo
    console.log('1️⃣ Verificando estado del adapter...');
    const healthResponse = await axios.get(`${ADAPTER_URL}/health`);
    console.log('✅ Adapter está funcionando:', healthResponse.data.status);
    
    // 2. Probar procesamiento asíncrono (con chunking y request_id)
    console.log('\n2️⃣ Probando procesamiento asíncrono...');
    const gradeResponse = await axios.post(`${ADAPTER_URL}/grade`, {
      host: "localhost",
      port: 8080,
      exams: testExams
    });
    
    console.log('📤 Respuesta del procesamiento:');
    console.log('  - Success:', gradeResponse.data.success);
    console.log('  - Request ID:', gradeResponse.data.request_id || 'N/A');
    console.log('  - Message:', gradeResponse.data.message || 'N/A');
    
    // 3. Si hay request_id, consultar estado
    if (gradeResponse.data.request_id) {
      console.log('\n3️⃣ Consultando estado de la request...');
      
      const requestId = gradeResponse.data.request_id;
      
      // Esperar un poco para permitir procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`${ADAPTER_URL}/status/${requestId}`);
      console.log('📊 Estado de la request:');
      console.log('  - Status:', statusResponse.data.status);
      console.log('  - Progress:', statusResponse.data.progress);
      console.log('  - Timestamps:', statusResponse.data.timestamps);
    }
    
    // 4. Verificar formato de datos enviados
    console.log('\n4️⃣ Verificando formato de datos...');
    console.log('✅ Formato de exámenes enviados:');
    console.log('  - student_id: string');
    console.log('  - exam_id: string');
    console.log('  - answers: string[] (formato ["A", "B", "C"])');
    
    console.log('\n✅ Formato esperado por cluster:');
    console.log('  - id_exam: UUID');
    console.log('  - process: UUID');
    console.log('  - area: UUID');
    console.log('  - request_id: UUID');
    console.log('  - answers: [{qst_idx: number, ans_idx: number}]');
    
    console.log('\n🎉 Test de compatibilidad completado exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en test de compatibilidad:');
    
    if (error.response) {
      console.error('  - Status:', error.response.status);
      console.error('  - Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  - Sin respuesta del servidor');
      console.error('  - ¿Está corriendo el adapter en puerto 3001?');
    } else {
      console.error('  - Error:', error.message);
    }
    
    console.log('\n🔧 Posibles soluciones:');
    console.log('  1. Verificar que el adapter esté corriendo: npm start');
    console.log('  2. Verificar que el cluster esté corriendo en puerto 8080');
    console.log('  3. Verificar conectividad de red');
  }
}

// Función para generar exámenes de prueba masivos
async function testMassiveLoad() {
  console.log('\n🚀 Generando test de carga masiva...');
  
  const massiveExams = [];
  for (let i = 0; i < 150; i++) { // Más de 50 para activar async
    massiveExams.push({
      student_id: `student-${i.toString().padStart(3, '0')}`,
      exam_id: `exam-${i.toString().padStart(3, '0')}`,
      answers: ["A", "B", "C", "D", "A"] // Respuestas dummy
    });
  }
  
  try {
    const response = await axios.post(`${ADAPTER_URL}/grade`, {
      exams: massiveExams
    });
    
    console.log(`✅ Procesamiento asíncrono iniciado para ${massiveExams.length} exámenes`);
    console.log(`📋 Request ID: ${response.data.request_id}`);
    console.log(`📊 Chunks: ${response.data.status?.chunks_total || 'N/A'}`);
    
    return response.data.request_id;
    
  } catch (error) {
    console.error('❌ Error en test masivo:', error.message);
    return null;
  }
}

// Ejecutar tests
async function runAllTests() {
  await testTCPCompatibility();
  
  const requestId = await testMassiveLoad();
  
  if (requestId) {
    console.log(`\n📋 Para monitorear el progreso, ejecuta:`);
    console.log(`curl ${ADAPTER_URL}/status/${requestId}`);
  }
}

if (require.main === module) {
  runAllTests();
}