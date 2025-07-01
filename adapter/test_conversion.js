const { SHProtocolAdapter } = require('./adapter.js');

// Crear instancia del adapter para probar la conversión
const adapter = new SHProtocolAdapter();

// Datos de prueba - formato del frontend
const frontendData = {
  exams: [
    {
      student_id: "EST001",
      exam_id: "EXAM_MAT_001",
      answers: ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"]
    },
    {
      student_id: "EST002", 
      exam_id: "EXAM_FIS_001",
      answers: ["B", "A", "D", "C", "B", "A", "D", "C", "B", "A"]
    },
    {
      student_id: "EST003",
      exam_id: "EXAM_QUIM_001", 
      answers: ["C", "D", "A", "B", "C", "D", "A", "B", "C", "D"]
    }
  ]
};

console.log('=== PRUEBA DE CONVERSIÓN DE FORMATOS ===\n');

console.log('📥 DATOS DEL FRONTEND:');
console.log(JSON.stringify(frontendData, null, 2));

console.log('\n🔄 CONVIRTIENDO AL FORMATO DEL CLUSTER...\n');

try {
  const convertedData = adapter.convertToClusterFormat(frontendData.exams);
  
  console.log('📤 DATOS CONVERTIDOS PARA EL CLUSTER:');
  console.log(JSON.stringify(convertedData, null, 2));
  
  console.log('\n✅ CONVERSIÓN EXITOSA');
  console.log(`- Exámenes procesados: ${convertedData.length}`);
  console.log(`- Respuestas convertidas por examen:`);
  
  convertedData.forEach((exam, index) => {
    console.log(`  Examen ${index + 1}: ${exam.answers.length} respuestas`);
    console.log(`    ID original: ${exam._metadata.original_exam_id} → ID numérico: ${exam.id_exam}`);
    console.log(`    Estudiante: ${exam._metadata.original_student_id}`);
    console.log(`    Primeras 3 respuestas convertidas:`);
    exam.answers.slice(0, 3).forEach((answer, i) => {
      console.log(`      Pregunta ${answer.qst_idx}: Respuesta ${answer.ans_idx}`);
    });
  });
  
} catch (error) {
  console.error('❌ ERROR EN LA CONVERSIÓN:', error.message);
}

console.log('\n=== FIN DE LA PRUEBA ===');