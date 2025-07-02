'use client'
import React, { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

interface AnswerKeysResponse {
  success: boolean;
  answer_keys: {
    [exam_id: string]: string[];
  };
  server_response: string;
  error?: string;
}

interface AnswerKeysPayload {
  answer_keys: {
    [exam_id: string]: string[];
  };
}

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

export default function AnswersPage() {
  const [answerKeysJson, setAnswerKeysJson] = useState<string>("");
  const [responseJson, setResponseJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<string>("");

  // Función para generar claves de respuesta aleatorias
  const generateRandomAnswerKeys = (): AnswerKeysPayload => {
    const numQuestions = 10;
    const examType = "EXAM_STAGE_001";

    const answer_keys: { [key: string]: string[] } = {};
    
    const answers: string[] = [];
    for (let i = 0; i < numQuestions; i++) {
      const patterns = [
        ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"],
        ["A", "A", "B", "C", "D", "A", "B", "C", "D", "A"],
        ["B", "A", "C", "A", "D", "B", "A", "C", "A", "D"]
      ];
      
      const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
      answers.push(selectedPattern[i]);
    }
    
    answer_keys[examType] = answers;
    
    return { answer_keys };
  };

  const handleLoadExample = () => {
    const randomKeys = generateRandomAnswerKeys();
    setAnswerKeysJson(JSON.stringify(randomKeys, null, 2));
    setServerStatus(`🔑 Generada clave de respuesta compatible con cluster (EXAM_STAGE_001)`);
  };

  const handleClearAll = () => {
    setAnswerKeysJson("");
    setResponseJson("");
    setServerStatus("");
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
        throw new Error("El JSON debe contener un objeto answer_keys");
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
          ]
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

  const handleError = (error: unknown, action: string) => {
    let errorMessage = "Error desconocido";
    
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

  return (
    <div style={{ padding: "20px" }} className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl">
        
        {/* Header con navegación */}
        <div className="w-full flex items-center justify-between mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
            ← Volver al Dashboard
          </Link>
          <Link href="/exams" className="text-blue-600 hover:text-blue-800">
            Ir a Calificar Exámenes →
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-center text-purple-600">
          🔑 Gestionar Claves de Respuesta
        </h1>
        
        <p className="text-gray-600 mb-6 text-center">
          Configurar y obtener claves de respuesta del cluster MPI
        </p>

        {/* Estado del servidor */}
        {serverStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg w-full">
            <p className="text-blue-700 text-center font-medium">{serverStatus}</p>
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

          <button 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
            onClick={handleGetAnswerKeys}
            disabled={isLoading}
          >
            📥 Obtener Claves
          </button>
          
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
            onClick={handleClearAll}
            disabled={isLoading}
          >
            🗑️ Limpiar Todo
          </button>
        </div>

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

        {/* Response JSON - Colapsable */}
        {responseJson && (
          <div className="w-full">
            <details className="w-full" open>
              <summary className="cursor-pointer p-3 bg-gray-100 rounded-t-lg font-medium text-gray-700 hover:bg-gray-200">
                📥 Respuesta del Servidor
              </summary>
              <div className="border border-gray-300 border-t-0 rounded-b-lg">
                <div className="w-full relative">
                  <textarea
                    className="text-black border-0 p-3 w-full font-mono text-sm bg-gray-50 resize-none"
                    value={responseJson}
                    readOnly
                    rows={20}
                    placeholder="Aquí aparecerán los resultados del servidor..."
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                      onClick={() => navigator.clipboard.writeText(responseJson)}
                      title="Copiar respuesta"
                    >
                      📋
                    </button>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                      onClick={() => {
                        const blob = new Blob([responseJson], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `scorehive-answers-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      title="Descargar como JSON"
                    >
                      💾
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg w-full">
          <h3 className="font-semibold text-purple-800 mb-2">ℹ️ Información sobre Claves de Respuesta:</h3>
          <div className="text-purple-700 text-sm space-y-1">
            <p><strong>Formato:</strong> JSON con objeto answer_keys que mapea exam_id → array de respuestas</p>
            <p><strong>Limitación del cluster:</strong> Solo almacena UNA ficha de respuestas a la vez (Stage 1)</p>
            <p><strong>Comandos disponibles:</strong> GET_ANSWERS (obtener), SET_ANSWERS (configurar)</p>
            <p><strong>Protocolo:</strong> ScoreHive Protocol (SH) - Comunicación TCP optimizada</p>
            <p><strong>Flujo típico:</strong> 1) Configurar claves → 2) Verificar con Obtener Claves → 3) Calificar exámenes</p>
          </div>
        </div>
      </div>
    </div>
  );
}