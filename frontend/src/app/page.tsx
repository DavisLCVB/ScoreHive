'use client'
import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001'; // CAMBIAR A URL DEL ADAPTADOR

interface MPIQuestion {
  qst_idx: number;
  ans_idx: number;
}

interface MPIExam {
  stage: number;
  id_exam: number;
  answers: MPIQuestion[];
}

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

  // Ejemplo de datos para mostrar el formato esperado - MÚLTIPLES EXÁMENES
  const exampleExamData: ExamsPayload = {
    exams: [
      {
        student_id: "EST001",
        exam_id: "EXAM_MAT_001",
        answers: ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"]
      },
      {
        student_id: "EST002", 
        exam_id: "EXAM_MAT_001",
        answers: ["B", "A", "D", "C", "B", "A", "D", "C", "B", "A"]
      },
      {
        student_id: "EST003", 
        exam_id: "EXAM_MAT_002",
        answers: ["C", "D", "A", "B", "C", "D", "A", "B", "C", "D"]
      },
      {
        student_id: "EST004",
        exam_id: "EXAM_FIS_001", 
        answers: ["D", "C", "B", "A", "D", "C", "B", "A", "D", "C"]
      },
      {
        student_id: "EST005",
        exam_id: "EXAM_MAT_001",
        answers: ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B"]
      },
      {
        student_id: "EST006",
        exam_id: "EXAM_MAT_002", 
        answers: ["C", "D", "A", "B", "C", "D", "A", "B", "C", "D"]
      }
    ]
  };

  const exampleAnswerKeys: AnswerKeysPayload = {
    answer_keys: {
      "EXAM_MAT_001": ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"],
      "EXAM_MAT_002": ["C", "D", "A", "B", "C", "D", "A", "B", "C", "D"],
      "EXAM_FIS_001": ["B", "A", "C", "D", "B", "A", "C", "D", "B", "A"]
    }
  };

  const handleLoadExample = () => {
    if (activeTab === 'grade') {
      setInputJson(JSON.stringify(exampleExamData, null, 2));
    } else {
      setAnswerKeysJson(JSON.stringify(exampleAnswerKeys, null, 2));
    }
  };

  const handleClearAll = () => {
    setInputJson("");
    setResponseJson("");
    setAnswerKeysJson("");
    setExamCount(0);
    setServerStatus("");
  };

  const handleGetAnswerKeys = async () => {
    setIsLoading(true);
    setServerStatus("📋 Obteniendo claves de respuesta...");

    try {
      console.log("🔍 Solicitando claves de respuesta...");
      
      const response = await axios.get(`${BASE_URL}/answers`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Claves obtenidas:', response.data);

      const result: AnswerKeysResponse = response.data;

      if (result.success) {
        setServerStatus(`✅ Claves de respuesta obtenidas exitosamente`);
        
        const formattedResponse = {
          status: "✅ CLAVES OBTENIDAS",
          server_response: result.server_response,
          answer_keys: result.answer_keys,
          exams_available: Object.keys(result.answer_keys || {}).length
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

      const response = await axios.post(`${BASE_URL}/answers`, parsedData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Claves configuradas:', response.data);

      const result = response.data;

      if (result.success) {
        setServerStatus(`✅ Claves de respuesta configuradas exitosamente`);
        
        const formattedResponse = {
          status: "✅ CLAVES CONFIGURADAS",
          server_response: result.server_response,
          exams_configured: Object.keys(parsedData.answer_keys).length
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

      const response = await axios.post(`${BASE_URL}/grade`, parsedData, {
        timeout: 30000, // 30 segundos para procesos MPI
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Respuesta del servidor:', response.data);

      const result: GradeResponse = response.data;

      if (result.success) {
        setServerStatus(`✅ ${result.exams_count} exámenes procesados exitosamente`);
        
        // Formatear resultados con información detallada - MÚLTIPLES EXÁMENES
        const formattedResponse = {
          status: "✅ CALIFICACIÓN COMPLETADA",
          exams_processed: result.exams_count,
          processing_time: result.processing_time,
          server_response: result.server_response,
          detailed_results: result.results.scores?.map((score: ExamResult) => ({
            student_id: score.student_id,
            score: score.score,
            percentage: score.percentage,
            correct_answers: score.correct_answers,
            wrong_answers: score.wrong_answers,
            unscored_answers: score.unscored_answers,
            total_questions: score.total_questions,
            status: score.percentage >= 60 ? "APROBADO" : "REPROBADO"
          })) || [],
          mpi_results: result.results.mpi_results || [],
          summary: {
            total_students: result.results.scores?.length || 0,
            total_exams_processed: result.exams_count,
            average_score: result.results.scores ? 
              (result.results.scores.reduce((sum, s) => sum + s.score, 0) / result.results.scores.length).toFixed(2) : 0,
            average_percentage: result.results.scores ? 
              (result.results.scores.reduce((sum, s) => sum + s.percentage, 0) / result.results.scores.length).toFixed(2) : 0,
            passed_students: result.results.scores?.filter(s => s.percentage >= 60).length || 0,
            failed_students: result.results.scores?.filter(s => s.percentage < 60).length || 0,
            pass_rate: result.results.scores ? 
              ((result.results.scores.filter(s => s.percentage >= 60).length / result.results.scores.length) * 100).toFixed(1) : 0
          }
        };

        setResponseJson(JSON.stringify(formattedResponse, null, 2));
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
            📋 Cargar Ejemplo
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
                placeholder={`Formato para MÚLTIPLES EXÁMENES:
{
  "exams": [
    {
      "student_id": "EST001",
      "exam_id": "EXAM_MAT_001", 
      "answers": ["A", "B", "C", "D", "A"]
    },
    {
      "student_id": "EST002",
      "exam_id": "EXAM_MAT_001", 
      "answers": ["B", "A", "C", "D", "B"]
    },
    {
      "student_id": "EST003",
      "exam_id": "EXAM_FIS_001", 
      "answers": ["C", "D", "A", "B", "C"]
    }
  ]
}

NOTA: 
- Se pueden enviar cientos o miles de exámenes
- exam_id es OBLIGATORIO
- answers se convierte a MPIQuestion[] en el servidor`}
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
                placeholder={`Formato requerido:
{
  "answer_keys": {
    "EXAM_MAT_001": ["A", "B", "C", "D", "A"],
    "EXAM_FIS_001": ["B", "A", "C", "D", "B"]
  }
}`}
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

        {/* Response JSON */}
        <div className='flex flex-col items-center w-full'>
          <label htmlFor="responseJson" className="text-lg font-semibold mb-2 text-gray-700">
            📥 Respuesta del Servidor:
          </label>
          <textarea 
            className="text-black border-2 border-gray-300 rounded-lg p-3 w-full font-mono text-sm bg-gray-50"
            id="responseJson"
            value={responseJson}
            readOnly
            rows={15}
            placeholder="Aquí aparecerán los resultados del servidor..."
          />
        </div>

        {/* Información adicional */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg w-full">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Información del Sistema:</h3>
          <div className="text-blue-700 text-sm space-y-1">
            <p><strong>Protocolo:</strong> ScoreHive Protocol</p>
            <p><strong>Comandos disponibles:</strong> GET_ANSWERS, SET_ANSWERS, REVIEW, ECHO, SHUTDOWN</p>
            <p><strong>Distribución:</strong> Procesamiento paralelo con MPI</p>
            <p><strong>Estructura:</strong> Frontend envía arrays de strings → Adapter convierte a MPIQuestion[] → Servidor procesa con MPI</p>
            <p><strong>Capacidad:</strong> Maneja múltiples exámenes (cientos/miles) en una sola petición</p>
          </div>
        </div>
      </div>
    </div>
  );
}