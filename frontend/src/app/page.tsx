'use client'
import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001'; // CAMBIAR A URL DEL ADAPTADOR

// Comentado porque el adapter maneja la conversión automáticamente  
// interface MPIQuestion {
//   qst_idx: number;
//   ans_idx: number;
// }

// Comentado porque el adapter maneja la conversión automáticamente
// interface MPIExam {
//   stage: number;
//   id_exam: number;
//   answers: MPIQuestion[];
// }

interface MPIResult {
  stage: number;
  id_exam: number;
  correct_answers: number;
  wrong_answers: number;
  unscored_answers: number;
  score: number;
}

// Estructura para el frontend (se convertirá a MPIExam en el adapter)
interface Exam {
  student_id: string;
  exam_id: string;  // Obligatorio
  answers: string[]; // Se convertirá a MPIQuestion[] en el adapter
}

interface ExamResult {
  student_id: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  unscored_answers: number;
  total_questions: number;
  percentage: number;
}

interface GradeResponse {
  success: boolean;
  exams_count: number;
  results: {
    scores?: ExamResult[];
    mpi_results?: MPIResult[];
    [key: string]: unknown; // Para extensibilidad futura
  };
  processing_time: string;
  server_response: string;
  error?: string;
  statistical_analysis?: {
    summary: {
      total_students: number;
      total_exams_processed: number;
      pass_threshold: string;
    };
    performance_metrics: {
      average_score: string;
      average_percentage: string;
      median_percentage: string;
      highest_score: string;
      lowest_score: string;
    };
    pass_fail_analysis: {
      passed_students: number;
      failed_students: number;
      pass_rate: string;
      fail_rate: string;
    };
    grade_distribution: {
      [key: string]: number;
    };
  };
  recommendations?: string[];
}

interface AnswerKeysResponse {
  success: boolean;
  answer_keys: {
    [exam_id: string]: string[];
  };
  server_response: string;
  error?: string;
}

// Interface para los datos de entrada completos
interface ExamsPayload {
  exams: Exam[];
}

// Interface para claves de respuesta
interface AnswerKeysPayload {
  answer_keys: {
    [exam_id: string]: string[];
  };
}

// Type para errores de axios
interface AxiosError {
  code?: string;
  message: string;
  response?: {
    status: number;
    data?: {
      error?: string;
    };
  };
}

export default function Home() {
  const [inputJson, setInputJson] = useState<string>("");
  const [responseJson, setResponseJson] = useState<string>("");
  const [answerKeysJson, setAnswerKeysJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [examCount, setExamCount] = useState<number>(0);
  const [serverStatus, setServerStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'grade' | 'answers'>('grade');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastResults, setLastResults] = useState<any>(null);

  // Función para generar exámenes aleatorios (con mayor probabilidad de aprobar)
  const generateRandomExams = (): ExamsPayload => {
    // Usar solo un tipo de examen ya que el cluster solo puede almacenar una ficha
    const examType = "EXAM_STAGE_001";
    const numQuestions = 10; // Estándar para el cluster

    const exams: Exam[] = [];

    for (let i = 1; i <= 10; i++) {
      // Generar respuestas con mayor probabilidad de ser correctas (70% de probabilidad)
      const answers: string[] = [];
      for (let j = 0; j < numQuestions; j++) {
        let selectedAnswer: string;
        if (Math.random() < 0.70) { // 70% probabilidad de respuesta correcta
          selectedAnswer = "A"; // Asumimos que A es generalmente la respuesta correcta
        } else {
          // 30% probabilidad de respuesta incorrecta
          const wrongAnswers = ["B", "C", "D"];
          selectedAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
        }
        answers.push(selectedAnswer);
      }

      exams.push({
        student_id: `EST${i.toString().padStart(3, '0')}`,
        exam_id: examType,
        answers: answers
      });
    }

    return { exams };
  };

  // Función para generar claves de respuesta aleatorias (compatible con cluster)
  const generateRandomAnswerKeys = (): AnswerKeysPayload => {
    const numQuestions = 10; // Estándar para el cluster
    const examType = "EXAM_STAGE_001"; // Tipo compatible con el cluster

    const answer_keys: { [key: string]: string[] } = {};
    
    // Generar clave de respuesta con patrón más realista
    const answers: string[] = [];
    for (let i = 0; i < numQuestions; i++) {
      // Patrón más balanceado de respuestas correctas
      const patterns = [
        ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"], // Patrón secuencial
        ["A", "A", "B", "C", "D", "A", "B", "C", "D", "A"], // Más As
        ["B", "A", "C", "A", "D", "B", "A", "C", "A", "D"]  // Patrón mixto
      ];
      
      const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
      answers.push(selectedPattern[i]);
    }
    
    answer_keys[examType] = answers;
    
    return { answer_keys };
  };

  const handleLoadExample = () => {
    if (activeTab === 'grade') {
      // Generar nuevos exámenes aleatorios cada vez
      const randomExams = generateRandomExams();
      setInputJson(JSON.stringify(randomExams, null, 2));
      setServerStatus(`🎲 Generados 10 exámenes aleatorios (70% probabilidad de aprobar)`);
    } else {
      // Generar nuevas claves aleatorias cada vez
      const randomKeys = generateRandomAnswerKeys();
      setAnswerKeysJson(JSON.stringify(randomKeys, null, 2));
      setServerStatus(`🔑 Generada clave de respuesta compatible con cluster (EXAM_STAGE_001)`);
    }
  };

  const handleClearAll = () => {
    setInputJson("");
    setResponseJson("");
    setAnswerKeysJson("");
    setExamCount(0);
    setServerStatus("");
    setLastResults(null);
  };

  const handleGetAnswerKeys = async () => {
    setIsLoading(true);
    setServerStatus("📋 Obteniendo claves de respuesta...");

    try {
      console.log("🔍 Solicitando claves de respuesta...");
      
      const response = await axios.get(`${BASE_URL}/answers/mpi-master/8080`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Claves obtenidas:', response.data);

      const result: AnswerKeysResponse = response.data;

      if (result.success) {
        const examCount = Object.keys(result.answer_keys || {}).length;
        setServerStatus(`✅ ${examCount} tipos de examen obtenidos exitosamente`);
        
        // Formatear respuesta con información más detallada
        const formattedResponse = {
          status: "✅ CLAVES DE RESPUESTA OBTENIDAS",
          server_response: result.server_response,
          exams_available: examCount,
          answer_keys: result.answer_keys,
          summary: {
            total_exam_types: examCount,
            exam_details: Object.entries(result.answer_keys || {}).map(([examId, answers]) => ({
              exam_id: examId,
              questions_count: answers.length,
              sample_answers: answers.slice(0, 5).join(', ') + (answers.length > 5 ? '...' : ''),
              full_answers: answers.join(', ')
            }))
          },
          usage_note: "Estas son las claves de respuesta correctas almacenadas en el cluster"
        };

        setResponseJson(JSON.stringify(formattedResponse, null, 2));
      } else {
        throw new Error(result.error || "Error al obtener claves de respuesta");
      }

    } catch (error: unknown) {
      console.error("❌ Error al obtener claves:", error);
      handleError(error, "obtener claves de respuesta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAnswerKeys = async () => {
    if (!answerKeysJson.trim()) {
      setResponseJson("❌ Error: Debe ingresar las claves de respuesta en formato JSON");
      return;
    }

    setIsLoading(true);
    setServerStatus("📝 Configurando claves de respuesta...");

    try {
      console.log("📝 Enviando nuevas claves de respuesta...");
      
      const parsedData: AnswerKeysPayload = JSON.parse(answerKeysJson);
      
      if (!parsedData.answer_keys || typeof parsedData.answer_keys !== 'object') {
        throw new Error("El JSON debe contener un objeto 'answer_keys'");
      }

      const response = await axios.post(`${BASE_URL}/answers/mpi-master/8080`, parsedData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Claves configuradas:', response.data);

      const result = response.data;

      if (result.success) {
        const examIds = Object.keys(parsedData.answer_keys);
        const firstExamId = examIds[0];
        const firstExamAnswers = parsedData.answer_keys[firstExamId];
        const hasMultipleExams = examIds.length > 1;
        
        setServerStatus(hasMultipleExams ? 
          `⚠️ Solo se configuró 1 examen (${firstExamId}). El cluster solo almacena una ficha a la vez` :
          `✅ Examen ${firstExamId} configurado exitosamente`
        );
        
        const formattedResponse = {
          status: hasMultipleExams ? "⚠️ CONFIGURACIÓN PARCIAL" : "✅ CLAVES CONFIGURADAS",
          server_response: result.server_response,
          cluster_limitation: "El cluster MPI solo puede almacenar UNA ficha de respuestas a la vez",
          configured_exam: {
            exam_id: firstExamId,
            questions_count: firstExamAnswers.length,
            answers_preview: firstExamAnswers.slice(0, 15).join(', ') + (firstExamAnswers.length > 15 ? '...' : ''),
            full_answers: firstExamAnswers.join(', '),
            status: "✅ Almacenado en cluster (Stage 1)"
          },
          ...(hasMultipleExams && {
            ignored_exams: {
              count: examIds.length - 1,
              exam_ids: examIds.slice(1),
              reason: "El cluster solo acepta una ficha de respuestas por vez"
            }
          }),
          summary: {
            total_exams_sent: examIds.length,
            exams_stored: 1,
            questions_in_stored_exam: firstExamAnswers.length,
            storage_location: "Cluster MPI - Stage 1"
          },
          next_steps: [
            "La ficha está lista para calificar exámenes",
            hasMultipleExams ? "Para usar otras fichas, envíelas una por vez" : "Use 'Calificar Exámenes' para evaluar estudiantes",
            "Verifique las claves con 'Obtener Claves'",
            "Genere exámenes de prueba que coincidan con esta ficha"
          ],
          recommendation: hasMultipleExams ? 
            "💡 Envíe las fichas de respuesta una por una para configurar diferentes tipos de examen" :
            "✅ Sistema listo para calificar exámenes"
        };

        setResponseJson(JSON.stringify(formattedResponse, null, 2));
      } else {
        throw new Error(result.error || "Error al configurar claves");
      }

    } catch (error: unknown) {
      console.error("❌ Error al configurar claves:", error);
      handleError(error, "configurar claves de respuesta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeExams = async () => {
    if (!inputJson.trim()) {
      setResponseJson("❌ Error: Debe ingresar datos JSON");
      return;
    }

    setIsLoading(true);
    setServerStatus("📡 Conectando al servidor...");

    try {
      console.log("🚀 Enviando exámenes para calificación...");
      
      const parsedData: ExamsPayload = JSON.parse(inputJson);
      
      if (!parsedData.exams || !Array.isArray(parsedData.exams)) {
        throw new Error("El JSON debe contener un array 'exams'");
      }

      // Validar cada examen - ESTRUCTURA PARA MÚLTIPLES EXÁMENES
      parsedData.exams.forEach((exam: Exam, index: number) => {
        if (!exam.student_id) {
          throw new Error(`Examen ${index + 1}: Falta 'student_id'`);
        }
        if (!exam.exam_id) {
          throw new Error(`Examen ${index + 1}: Falta 'exam_id' (obligatorio)`);
        }
        if (!exam.answers || !Array.isArray(exam.answers)) {
          throw new Error(`Examen ${index + 1}: Falta array 'answers'`);
        }
        if (exam.answers.length === 0) {
          throw new Error(`Examen ${index + 1}: Array 'answers' está vacío`);
        }
        // Validar que las respuestas sean strings válidos (A, B, C, D, etc.)
        exam.answers.forEach((answer: string, answerIndex: number) => {
          if (typeof answer !== 'string' || answer.trim() === '') {
            throw new Error(`Examen ${index + 1}, Pregunta ${answerIndex + 1}: Respuesta inválida`);
          }
        });
      });

      setExamCount(parsedData.exams.length);
      setServerStatus(`📝 Procesando ${parsedData.exams.length} exámenes...`);

      const response = await axios.post(`${BASE_URL}/grade`, {
        host: 'mpi-master',
        port: 8080,
        ...parsedData
      }, {
        timeout: 30000, // 30 segundos para procesos MPI
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Respuesta del servidor:', response.data);

      const result: GradeResponse = response.data;

      if (result.success) {
        setServerStatus(`✅ ${result.exams_count} exámenes procesados exitosamente`);
        
        // Formatear resultados con información detallada y análisis completo
        const scores = result.results.scores || [];
        const passThreshold = 60;
        const passedStudents = scores.filter(s => s.percentage >= passThreshold);
        const failedStudents = scores.filter(s => s.percentage < passThreshold);
        
        const formattedResponse = {
          status: "✅ CALIFICACIÓN COMPLETADA",
          processing_info: {
            exams_processed: result.exams_count,
            processing_time: result.processing_time,
            server_response: result.server_response,
            mpi_processing: "Procesamiento distribuido completado exitosamente"
          },
          student_results: scores.map((score: ExamResult) => ({
            student_id: score.student_id,
            score: score.score,
            percentage: `${score.percentage}%`,
            status: score.percentage >= passThreshold ? "✅ APROBADO" : "❌ REPROBADO",
            breakdown: {
              correct: score.correct_answers,
              wrong: score.wrong_answers,
              unscored: score.unscored_answers,
              total: score.total_questions
            },
            grade_letter: score.percentage >= 90 ? "A" : 
                         score.percentage >= 80 ? "B" :
                         score.percentage >= 70 ? "C" :
                         score.percentage >= 60 ? "D" : "F"
          })),
          statistical_analysis: {
            summary: {
              total_students: scores.length,
              total_exams_processed: result.exams_count,
              pass_threshold: `${passThreshold}%`
            },
            performance_metrics: {
              average_score: scores.length > 0 ? 
                (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(2) : "0",
              average_percentage: scores.length > 0 ? 
                (scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length).toFixed(1) + "%" : "0%",
              median_percentage: scores.length > 0 ? 
                scores.sort((a, b) => a.percentage - b.percentage)[Math.floor(scores.length / 2)].percentage.toFixed(1) + "%" : "0%",
              highest_score: scores.length > 0 ? Math.max(...scores.map(s => s.percentage)).toFixed(1) + "%" : "0%",
              lowest_score: scores.length > 0 ? Math.min(...scores.map(s => s.percentage)).toFixed(1) + "%" : "0%"
            },
            pass_fail_analysis: {
              passed_students: passedStudents.length,
              failed_students: failedStudents.length,
              pass_rate: scores.length > 0 ? 
                ((passedStudents.length / scores.length) * 100).toFixed(1) + "%" : "0%",
              fail_rate: scores.length > 0 ? 
                ((failedStudents.length / scores.length) * 100).toFixed(1) + "%" : "0%"
            },
            grade_distribution: {
              "A (90-100%)": scores.filter(s => s.percentage >= 90).length,
              "B (80-89%)": scores.filter(s => s.percentage >= 80 && s.percentage < 90).length,
              "C (70-79%)": scores.filter(s => s.percentage >= 70 && s.percentage < 80).length,
              "D (60-69%)": scores.filter(s => s.percentage >= 60 && s.percentage < 70).length,
              "F (0-59%)": scores.filter(s => s.percentage < 60).length
            }
          },
          raw_mpi_data: result.results.mpi_results || [],
          recommendations: [
            passedStudents.length === scores.length ? "🎉 ¡Excelente! Todos los estudiantes aprobaron" :
            failedStudents.length === scores.length ? "⚠️ Ningún estudiante aprobó. Revisar contenido del examen" :
            `📊 ${passedStudents.length} estudiantes aprobaron, ${failedStudents.length} reprobaron`,
            scores.length > 0 && (scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length) < 50 ? 
              "📚 Promedio bajo. Considerar refuerzo académico" : 
              "📈 Rendimiento general aceptable"
          ]
        };

        setResponseJson(JSON.stringify(formattedResponse, null, 2));
        setLastResults(formattedResponse); // Guardar para mostrar el resumen
      } else {
        throw new Error(result.error || "Error desconocido del servidor");
      }

    } catch (error: unknown) {
      console.error("❌ Error al procesar exámenes:", error);
      handleError(error, "procesar exámenes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: unknown, action: string) => {
    let errorMessage = "Error desconocido";
    
    // Type guard para verificar si es un error de axios
    const isAxiosError = (err: unknown): err is AxiosError => {
      return typeof err === 'object' && err !== null && ('code' in err || 'response' in err);
    };

    if (isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        errorMessage = "No se puede conectar al adaptador. ¿Está ejecutándose en puerto correcto?";
        setServerStatus("❌ Sin conexión al adaptador");
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = "Timeout - El servidor no responde (posible problema con MPI)";
        setServerStatus("⏱️ Timeout del servidor");
      } else if (error.response) {
        errorMessage = error.response.data?.error || error.message;
        setServerStatus(`❌ Error del servidor: ${error.response.status}`);
      } else {
        errorMessage = error.message;
        setServerStatus("❌ Error de procesamiento");
      }
    } else if (error instanceof SyntaxError) {
      errorMessage = "JSON inválido - Verifique el formato";
      setServerStatus("❌ Error de formato JSON");
    } else if (error instanceof Error) {
      errorMessage = error.message;
      setServerStatus("❌ Error de procesamiento");
    }

    const errorResponse = {
      status: "❌ ERROR",
      action: action,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Verifique que el adaptador esté ejecutándose en el puerto correcto",
        "Verifique que el servidor TCP esté disponible en el puerto correcto",
        "Verifique que el cluster MPI esté configurado correctamente",
        "Revise el formato JSON de entrada"
      ]
    };

    setResponseJson(JSON.stringify(errorResponse, null, 2));
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setServerStatus("🔍 Probando conexión...");

    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      console.log('✅ Estado del adaptador:', response.data);
      
      setServerStatus("✅ Adaptador funcionando correctamente");
      setResponseJson(JSON.stringify({
        status: "✅ CONECTADO",
        adapter_info: response.data,
        protocol: "ScoreHive Protocol - Davis",
        available_commands: ["GET_ANSWERS", "SET_ANSWERS", "REVIEW", "ECHO", "SHUTDOWN"]
      }, null, 2));
      
    } catch (error: unknown) {
      console.error("❌ Error de conexión:", error);
      setServerStatus("❌ No se puede conectar al adaptador");
      setResponseJson(JSON.stringify({
        status: "❌ SIN CONEXIÓN",
        error: "No se puede conectar al adaptador",
        suggestion: "Ejecute: npm start en el directorio del adaptador"
      }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }} className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl">
        
        <h1 className="text-4xl font-bold mb-2 text-center text-[#257085]">
          📝 ScoreHive - Sistema de Calificación
        </h1>
        
        <p className="text-gray-600 mb-4 text-center">
          Sistema distribuido de calificación de exámenes con protocolo ScoreHive
        </p>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-200 rounded-lg p-1">
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'grade' 
                ? 'bg-[#257085] text-white' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('grade')}
          >
            🚀 Calificar Exámenes
          </button>
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'answers' 
                ? 'bg-[#257085] text-white' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('answers')}
          >
            🔑 Gestionar Claves
          </button>
        </div>

        {/* Estado del servidor */}
        {serverStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg w-full">
            <p className="text-blue-700 text-center font-medium">{serverStatus}</p>
            {examCount > 0 && (
              <p className="text-blue-600 text-center text-sm">
                Exámenes a procesar: {examCount}
              </p>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 mb-6 flex-wrap justify-center">
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
            onClick={handleLoadExample}
            disabled={isLoading}
          >
            🎲 Generar Aleatorio
          </button>
          
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
            onClick={handleTestConnection}
            disabled={isLoading}
          >
            🔍 Probar Conexión
          </button>

          {activeTab === 'answers' && (
            <button 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
              onClick={handleGetAnswerKeys}
              disabled={isLoading}
            >
              📥 Obtener Claves
            </button>
          )}
          
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
            onClick={handleClearAll}
            disabled={isLoading}
          >
            🗑️ Limpiar Todo
          </button>
        </div>

        {/* Contenido según la pestaña activa */}
        {activeTab === 'grade' ? (
          <>
            {/* Input JSON para exámenes */}
            <div className='flex flex-col items-center mb-4 w-full'>
              <label htmlFor="inputJson" className="text-lg font-semibold mb-2 text-gray-700">
                📤 JSON de Exámenes:
              </label>
              <textarea 
                className="text-black border-2 border-gray-300 rounded-lg p-3 w-full font-mono text-sm"
                id="inputJson"
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                rows={12}
                placeholder={`Formato para MÚLTIPLES EXÁMENES (Compatible con Cluster):
{
  "exams": [
    {
      "student_id": "EST001",
      "exam_id": "EXAM_STAGE_001", 
      "answers": ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"]
    },
    {
      "student_id": "EST002",
      "exam_id": "EXAM_STAGE_001", 
      "answers": ["B", "A", "C", "D", "B", "A", "C", "D", "B", "A"]
    }
  ]
}

🎲 GENERACIÓN ALEATORIA MEJORADA:
- Presiona "Generar Aleatorio" para crear 10 exámenes
- Tipo: EXAM_STAGE_001 (compatible con cluster MPI)
- 70% probabilidad de respuestas correctas (mayor tasa de aprobación)
- 10 preguntas por examen (estándar del cluster)

⚠️ LIMITACIÓN DEL CLUSTER: 
- Solo puede almacenar UNA ficha de respuestas a la vez
- Todos los exámenes deben usar el mismo exam_id
- Configurar claves antes de calificar exámenes`}
                disabled={isLoading}
              />
            </div>

            {/* Botón principal de calificación */}
            <div className="mb-6">
              <button 
                className={`px-8 py-3 rounded-lg shadow-md text-white font-semibold transition-all duration-300 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#257085] hover:bg-[#1a5a6b] hover:shadow-lg focus:shadow-lg active:shadow-lg focus:outline-none'
                }`}
                onClick={handleGradeExams}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando con MPI...
                  </span>
                ) : (
                  '🚀 Calificar Exámenes'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Input JSON para claves de respuesta */}
            <div className='flex flex-col items-center mb-4 w-full'>
              <label htmlFor="answerKeysJson" className="text-lg font-semibold mb-2 text-gray-700">
                🔑 JSON de Claves de Respuesta:
              </label>
              <textarea 
                className="text-black border-2 border-gray-300 rounded-lg p-3 w-full font-mono text-sm"
                id="answerKeysJson"
                value={answerKeysJson}
                onChange={(e) => setAnswerKeysJson(e.target.value)}
                rows={12}
                placeholder={`Formato requerido (Compatible con Cluster):
{
  "answer_keys": {
    "EXAM_STAGE_001": ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"]
  }
}

🎲 GENERACIÓN ALEATORIA:
- Presiona "Generar Aleatorio" para crear clave compatible
- Tipo: EXAM_STAGE_001 (reconocido por el cluster MPI)
- 10 preguntas estándar
- Patrones realistas de respuestas

⚠️ LIMITACIÓN DEL CLUSTER:
- Solo acepta UNA ficha de respuestas a la vez
- Si envías múltiples fichas, solo se usará la primera
- Recomendación: configurar una ficha por vez`}
                disabled={isLoading}
              />
            </div>

            {/* Botón para configurar claves */}
            <div className="mb-6">
              <button 
                className={`px-8 py-3 rounded-lg shadow-md text-white font-semibold transition-all duration-300 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg focus:shadow-lg active:shadow-lg focus:outline-none'
                }`}
                onClick={handleSetAnswerKeys}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Configurando...
                  </span>
                ) : (
                  '🔑 Configurar Claves'
                )}
              </button>
            </div>
          </>
        )}

        {/* Results Summary - Solo para resultados de calificación */}
        {lastResults && lastResults.statistical_analysis && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg w-full">
            <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
              📊 Resumen de Resultados del Cluster
            </h3>
            
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg border border-green-100 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lastResults.statistical_analysis.summary.total_students}
                </div>
                <div className="text-sm text-gray-600">Estudiantes Evaluados</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-100 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {lastResults.statistical_analysis.performance_metrics.average_percentage}
                </div>
                <div className="text-sm text-gray-600">Promedio General</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-purple-100 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {lastResults.statistical_analysis.pass_fail_analysis.pass_rate}
                </div>
                <div className="text-sm text-gray-600">Tasa de Aprobación</div>
              </div>
            </div>

            {/* Distribución de notas */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 mb-4">
              <h4 className="font-semibold text-gray-800 mb-3">Distribución de Calificaciones:</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                {Object.entries(lastResults.statistical_analysis.grade_distribution).map(([grade, count]) => (
                  <div key={grade} className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold text-lg">{count as number}</div>
                    <div className="text-xs text-gray-600">{grade}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aprobados vs Reprobados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <div className="text-3xl text-green-600 mb-1">✅</div>
                <div className="text-lg font-bold text-green-800">
                  {lastResults.statistical_analysis.pass_fail_analysis.passed_students} Aprobados
                </div>
                <div className="text-sm text-green-600">
                  {lastResults.statistical_analysis.pass_fail_analysis.pass_rate}
                </div>
              </div>
              
              <div className="bg-red-100 p-4 rounded-lg text-center">
                <div className="text-3xl text-red-600 mb-1">❌</div>
                <div className="text-lg font-bold text-red-800">
                  {lastResults.statistical_analysis.pass_fail_analysis.failed_students} Reprobados
                </div>
                <div className="text-sm text-red-600">
                  {lastResults.statistical_analysis.pass_fail_analysis.fail_rate}
                </div>
              </div>
            </div>

            {/* Recomendaciones */}
            {lastResults.recommendations && lastResults.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Recomendaciones:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {lastResults.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Response JSON */}
        <div className='flex flex-col items-center w-full'>
          <label htmlFor="responseJson" className="text-lg font-semibold mb-2 text-gray-700">
            📥 Respuesta del Servidor:
          </label>
          <div className="w-full relative">
            <textarea 
              className="text-black border-2 border-gray-300 rounded-lg p-3 w-full font-mono text-sm bg-gray-50"
              id="responseJson"
              value={responseJson}
              readOnly
              rows={20}
              placeholder="Aquí aparecerán los resultados del servidor..."
            />
            {responseJson && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => navigator.clipboard.writeText(responseJson)}
                  title="Copiar respuesta"
                >
                  📋 Copiar
                </button>
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => {
                    const blob = new Blob([responseJson], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `scorehive-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  title="Descargar como JSON"
                >
                  💾 Descargar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg w-full">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Información del Sistema:</h3>
          <div className="text-blue-700 text-sm space-y-1">
            <p><strong>Protocolo:</strong> ScoreHive Protocol (SH) - Comunicación TCP optimizada</p>
            <p><strong>Comandos disponibles:</strong> GET_ANSWERS, SET_ANSWERS, REVIEW, ECHO, SHUTDOWN</p>
            <p><strong>Distribución:</strong> Procesamiento paralelo con MPI (Master + Workers)</p>
            <p><strong>Arquitectura:</strong> Frontend (Next.js) → Adapter (HTTP-to-TCP) → Cluster (MPI C++)</p>
            <p><strong>Conversión automática:</strong> Strings → MPIQuestion[] → Resultados estadísticos</p>
            <p><strong>Capacidad:</strong> Procesa múltiples exámenes (cientos/miles) simultáneamente</p>
            <p><strong>Análisis:</strong> Estadísticas completas, distribución de notas, recomendaciones</p>
            <p><strong>Exportación:</strong> Resultados descargables en formato JSON</p>
            <p><strong>Generación inteligente:</strong> 70% probabilidad de aprobar, formato compatible con cluster</p>
            <p><strong>Limitaciones del cluster:</strong> Solo almacena una ficha de respuestas a la vez (Stage 1)</p>
          </div>
          <div className="mt-3 p-2 bg-blue-100 rounded">
            <p className="text-blue-800 text-xs">
              <strong>🔧 Mejoras implementadas:</strong> SET_ANSWERS corregido para una ficha, mayor probabilidad de aprobar, 
              resumen visual de resultados, análisis estadístico completo, interfaz optimizada para cluster MPI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}