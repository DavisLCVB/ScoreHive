"use client";
import React, { useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";

const BASE_URL = "http://localhost:3001";

interface ExamResult {
  student_id: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  unscored_answers: number;
  total_questions: number;
  percentage: number;
}

interface MPIResult {
  stage: number;
  id_exam: number;
  correct_answers: number;
  wrong_answers: number;
  unscored_answers: number;
  score: number;
}

interface GradeResponse {
  success: boolean;
  exams_count: number;
  results: {
    scores?: ExamResult[];
    mpi_results?: MPIResult[];
    [key: string]: unknown;
  };
  processing_time: string;
  server_response: string;
  error?: string;
  detailed_results?: ExamResult[];
  student_results?: ExamResult[];
}

interface Exam {
  student_id: string;
  exam_id: string;
  answers: string[];
}

interface ExamsPayload {
  exams: Exam[];
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

export default function ExamsPage() {
  const [inputJson, setInputJson] = useState<string>("");
  const [responseJson, setResponseJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [examCount, setExamCount] = useState<number>(0);
  const [serverStatus, setServerStatus] = useState<string>("");
  const [lastResults, setLastResults] = useState<{
    student_results?: Array<{
      student_id: string;
      score: number;
      percentage: string;
      status: string;
      breakdown: {
        correct: number;
        wrong: number;
        unscored: number;
      };
      grade_letter: string;
    }>;
    statistical_analysis?: {
      summary: {
        total_students: number;
        total_exams_processed: number;
        pass_threshold: string;
      };
      performance_metrics: { average_percentage: string };
      pass_fail_analysis: {
        passed_students: number;
        failed_students: number;
        pass_rate: string;
        fail_rate: string;
      };
      grade_distribution: Record<string, number>;
    };
    processing_info?: {
      processing_time: string;
      exams_processed?: number;
      server_response?: string;
      mpi_processing?: string;
    };
    recommendations?: string[];
    summary_only?: boolean;
    cluster_note?: string;
    basic_stats?: {
      total_exams_processed: number;
      processing_completed: boolean;
      system_status: string;
      average_score?: number;
      highest_score?: number;
      lowest_score?: number;
    };
    score_statistics?: {
      average_score: string;
      highest_score: string;
      lowest_score: string;
      total_scored_exams: number;
    };
  } | null>(null);
  const [uploadMode, setUploadMode] = useState<"manual" | "file">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para generar exámenes aleatorios
  const generateRandomExams = (): ExamsPayload => {
    const examType = "EXAM_STAGE_001";
    const numQuestions = 10;
    const exams: Exam[] = [];

    for (let i = 1; i <= 10; i++) {
      const answers: string[] = [];
      for (let j = 0; j < numQuestions; j++) {
        let selectedAnswer: string;
        if (Math.random() < 0.7) {
          selectedAnswer = "A";
        } else {
          const wrongAnswers = ["B", "C", "D"];
          selectedAnswer =
            wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
        }
        answers.push(selectedAnswer);
      }

      exams.push({
        student_id: `EST${i.toString().padStart(3, "0")}`,
        exam_id: examType,
        answers: answers,
      });
    }

    return { exams };
  };

  const handleLoadExample = () => {
    const randomExams = generateRandomExams();
    setInputJson(JSON.stringify(randomExams, null, 2));
    setServerStatus(
      `🎲 Generados 10 exámenes aleatorios (70% probabilidad de aprobar)`
    );
  };

  const handleClearAll = () => {
    setInputJson("");
    setResponseJson("");
    setExamCount(0);
    setServerStatus("");
    setLastResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setServerStatus("❌ Error: Solo se aceptan archivos .json");
      return;
    }

    setServerStatus("📁 Cargando archivo...");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validar estructura básica
        if (!parsed.exams || !Array.isArray(parsed.exams)) {
          throw new Error("El archivo debe contener un objeto con array exams");
        }

        setInputJson(JSON.stringify(parsed, null, 2));
        setServerStatus(
          `✅ Archivo cargado: ${parsed.exams.length} exámenes encontrados`
        );
        setExamCount(parsed.exams.length);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        setServerStatus(
          `❌ Error al procesar el archivo: ${
            error instanceof Error ? error.message : "Formato inválido"
          }`
        );
      }
    };

    reader.onerror = () => {
      setServerStatus("❌ Error al leer el archivo");
    };

    reader.readAsText(file);
  };

  const handleGradeExams = async () => {
    if (!inputJson.trim()) {
      setResponseJson("❌ Error: Debe ingresar datos JSON o cargar un archivo");
      return;
    }

    setIsLoading(true);
    setServerStatus("📡 Conectando al servidor...");

    try {
      console.log("🚀 Enviando exámenes para calificación...");

      const parsedData: ExamsPayload = JSON.parse(inputJson);

      if (!parsedData.exams || !Array.isArray(parsedData.exams)) {
        throw new Error("El JSON debe contener un array exams");
      }

      parsedData.exams.forEach((exam: Exam, index: number) => {
        if (!exam.student_id) {
          throw new Error(`Examen ${index + 1}: Falta student_id`);
        }
        if (!exam.exam_id) {
          throw new Error(`Examen ${index + 1}: Falta exam_id (obligatorio)`);
        }
        if (!exam.answers || !Array.isArray(exam.answers)) {
          throw new Error(`Examen ${index + 1}: Falta array answers`);
        }
        if (exam.answers.length === 0) {
          throw new Error(`Examen ${index + 1}: Array answers está vacío`);
        }
        exam.answers.forEach((answer: string, answerIndex: number) => {
          if (typeof answer !== "string" || answer.trim() === "") {
            throw new Error(
              `Examen ${index + 1}, Pregunta ${
                answerIndex + 1
              }: Respuesta inválida`
            );
          }
        });
      });

      setExamCount(parsedData.exams.length);
      setServerStatus(`📝 Procesando ${parsedData.exams.length} exámenes...`);

      const response = await axios.post(
        `${BASE_URL}/grade`,
        {
          host: "mpi-master",
          port: 8080,
          ...parsedData,
        },
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Respuesta del servidor:", response.data);

      const result: GradeResponse = response.data;

      if (result.success) {
        setServerStatus(
          `✅ ${result.exams_count} exámenes procesados exitosamente`
        );

        const scores =
          result.results?.scores ||
          result.detailed_results ||
          result.student_results ||
          [];
        console.log("📊 Datos de scores extraídos:", scores);
        console.log("📊 Cantidad de scores:", scores.length);
        console.log("📊 Exámenes procesados:", result.exams_count);

        if (!Array.isArray(scores) || scores.length === 0) {
          console.warn(
            "⚠️ No se recibieron datos individuales, mostrando solo resumen"
          );
          setServerStatus(
            `✅ Procesados ${result.exams_count} exámenes - Solo resumen disponible`
          );

          // Extraer estadísticas de los datos MPI si están disponibles
          const mpiResults = result.results?.mpi_results || [];
          console.log("📊 Datos MPI para análisis:", mpiResults);

          let scoreStats = {
            average_score: "N/A",
            highest_score: "N/A",
            lowest_score: "N/A",
            total_scored_exams: 0,
          };

          if (Array.isArray(mpiResults) && mpiResults.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const scores = mpiResults.map((result: any) => result.score || 0);
            const validScores = scores.filter((score) => score > 0);

            if (validScores.length > 0) {
              const average =
                validScores.reduce((sum, score) => sum + score, 0) /
                validScores.length;
              scoreStats = {
                average_score: average.toFixed(2),
                highest_score: Math.max(...validScores).toString(),
                lowest_score: Math.min(...validScores).toString(),
                total_scored_exams: validScores.length,
              };
            }
          }

          // Crear resumen básico sin datos individuales pero con estadísticas
          const summaryResponse = {
            status: "✅ PROCESAMIENTO COMPLETADO",
            processing_info: {
              exams_processed: result.exams_count,
              processing_time: result.processing_time,
              server_response: result.server_response,
              mpi_processing:
                "Procesamiento distribuido completado exitosamente",
            },
            summary_only: true,
            cluster_note:
              "El cluster procesó los exámenes pero no devolvió datos individuales de estudiantes",
            basic_stats: {
              total_exams_processed: result.exams_count,
              processing_completed: true,
              system_status: "Operativo",
              average_score: parseFloat(scoreStats.average_score),
              highest_score: parseFloat(scoreStats.highest_score),
              lowest_score: parseFloat(scoreStats.lowest_score),
            },
            score_statistics: scoreStats,
          };

          setResponseJson(JSON.stringify(summaryResponse, null, 2));
          setLastResults(summaryResponse);
          console.log("📊 Resumen básico guardado:", summaryResponse);
          return;
        }

        const passThreshold = 60;
        const passedStudents = scores.filter(
          (s) => (s.percentage || 0) >= passThreshold
        );
        const failedStudents = scores.filter(
          (s) => (s.percentage || 0) < passThreshold
        );

        // Calcular estadísticas de puntajes
        const allScores = scores.map((s) => s.score || 0);
        const averageScore =
          allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const highestScore = Math.max(...allScores);
        const lowestScore = Math.min(...allScores);

        const formattedResponse = {
          status: "✅ CALIFICACIÓN COMPLETADA",
          processing_info: {
            exams_processed: result.exams_count,
            processing_time: result.processing_time,
            server_response: result.server_response,
            mpi_processing: "Procesamiento distribuido completado exitosamente",
          },
          student_results: scores.map(
            (score: {
              student_id?: string;
              score?: number;
              percentage?: string | number;
              correct_answers?: number;
              wrong_answers?: number;
              unscored_answers?: number;
              total_questions?: number;
              status?: string;
            }) => {
              const percentage =
                typeof score.percentage === "string"
                  ? parseFloat(score.percentage)
                  : score.percentage || 0;
              const actualScore = score.score || score.correct_answers || 0;
              const totalQuestions =
                score.total_questions ||
                (score.correct_answers || 0) +
                  (score.wrong_answers || 0) +
                  (score.unscored_answers || 0) ||
                10;

              return {
                student_id: score.student_id || "Desconocido",
                score: actualScore,
                percentage: `${percentage.toFixed(1)}%`,
                status:
                  percentage >= passThreshold ? "✅ APROBADO" : "❌ REPROBADO",
                breakdown: {
                  correct: score.correct_answers || 0,
                  wrong: score.wrong_answers || 0,
                  unscored: score.unscored_answers || 0,
                  total: totalQuestions,
                },
                grade_letter:
                  percentage >= 90
                    ? "A"
                    : percentage >= 80
                    ? "B"
                    : percentage >= 70
                    ? "C"
                    : percentage >= 60
                    ? "D"
                    : "F",
              };
            }
          ),
          statistical_analysis: {
            summary: {
              total_students: scores.length,
              total_exams_processed: result.exams_count,
              pass_threshold: `${passThreshold}%`,
            },
            performance_metrics: {
              average_score:
                scores.length > 0
                  ? (
                      scores.reduce((sum, s) => sum + (s.score || 0), 0) /
                      scores.length
                    ).toFixed(2)
                  : "0",
              average_percentage:
                scores.length > 0
                  ? (
                      scores.reduce((sum, s) => sum + (s.percentage || 0), 0) /
                      scores.length
                    ).toFixed(1) + "%"
                  : "0%",
              highest_score:
                scores.length > 0
                  ? Math.max(...scores.map((s) => s.percentage || 0)).toFixed(
                      1
                    ) + "%"
                  : "0%",
              lowest_score:
                scores.length > 0
                  ? Math.min(...scores.map((s) => s.percentage || 0)).toFixed(
                      1
                    ) + "%"
                  : "0%",
            },
            pass_fail_analysis: {
              passed_students: passedStudents.length,
              failed_students: failedStudents.length,
              pass_rate:
                scores.length > 0
                  ? ((passedStudents.length / scores.length) * 100).toFixed(1) +
                    "%"
                  : "0%",
              fail_rate:
                scores.length > 0
                  ? ((failedStudents.length / scores.length) * 100).toFixed(1) +
                    "%"
                  : "0%",
            },
            grade_distribution: {
              "A (90-100%)": scores.filter((s) => (s.percentage || 0) >= 90)
                .length,
              "B (80-89%)": scores.filter(
                (s) => (s.percentage || 0) >= 80 && (s.percentage || 0) < 90
              ).length,
              "C (70-79%)": scores.filter(
                (s) => (s.percentage || 0) >= 70 && (s.percentage || 0) < 80
              ).length,
              "D (60-69%)": scores.filter(
                (s) => (s.percentage || 0) >= 60 && (s.percentage || 0) < 70
              ).length,
              "F (0-59%)": scores.filter((s) => (s.percentage || 0) < 60)
                .length,
            },
          },
          recommendations: [
            passedStudents.length === scores.length
              ? "🎉 ¡Excelente! Todos los estudiantes aprobaron"
              : failedStudents.length === scores.length
              ? "⚠️ Ningún estudiante aprobó. Revisar contenido del examen"
              : `📊 ${passedStudents.length} estudiantes aprobaron, ${failedStudents.length} reprobaron`,
            scores.length > 0 &&
            scores.reduce((sum, s) => sum + (s.percentage || 0), 0) /
              scores.length <
              50
              ? "📚 Promedio bajo. Considerar refuerzo académico"
              : "📈 Rendimiento general aceptable",
          ],
          basic_stats: {
            total_exams_processed: result.exams_count,
            processing_completed: true,
            system_status: "Operativo",
            average_score: averageScore,
            highest_score: highestScore,
            lowest_score: lowestScore,
          },
        };

        setResponseJson(JSON.stringify(formattedResponse, null, 2));
        setLastResults(formattedResponse);
        console.log(
          "🎯 Resultados guardados en lastResults:",
          formattedResponse
        );
        console.log(
          "🎯 student_results array:",
          formattedResponse.student_results
        );
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

  const handleTestConnection = async () => {
    setIsLoading(true);
    setServerStatus("🔍 Probando conexión...");

    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      console.log("✅ Estado del adaptador:", response.data);

      setServerStatus("✅ Adaptador funcionando correctamente");
      setResponseJson(
        JSON.stringify(
          {
            status: "✅ CONECTADO",
            adapter_info: response.data,
            protocol: "ScoreHive Protocol - Davis",
            available_commands: [
              "GET_ANSWERS",
              "SET_ANSWERS",
              "REVIEW",
              "ECHO",
              "SHUTDOWN",
            ],
          },
          null,
          2
        )
      );
    } catch (error: unknown) {
      console.error("❌ Error de conexión:", error);
      setServerStatus("❌ No se puede conectar al adaptador");
      setResponseJson(
        JSON.stringify(
          {
            status: "❌ SIN CONEXIÓN",
            error: "No se puede conectar al adaptador",
            suggestion: "Ejecute: npm start en el directorio del adaptador",
          },
          null,
          2
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: unknown, action: string) => {
    let errorMessage = "Error desconocido";

    const isAxiosError = (err: unknown): err is AxiosError => {
      return (
        typeof err === "object" &&
        err !== null &&
        ("code" in err || "response" in err)
      );
    };

    if (isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        errorMessage =
          "No se puede conectar al adaptador. ¿Está ejecutándose en puerto correcto?";
        setServerStatus("❌ Sin conexión al adaptador");
      } else if (error.code === "ETIMEDOUT") {
        errorMessage =
          "Timeout - El servidor no responde (posible problema con MPI)";
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
        "Revise el formato JSON de entrada",
      ],
    };

    setResponseJson(JSON.stringify(errorResponse, null, 2));
  };

  return (
    <div
      style={{ padding: "20px" }}
      className="flex flex-col items-center justify-center min-h-screen"
    >
      <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl">
        {/* Header con navegación */}
        <div className="w-full flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Volver al Dashboard
          </Link>
          <Link href="/answers" className="text-blue-600 hover:text-blue-800">
            Ir a Gestionar Claves →
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-center text-[#257085]">
          🚀 Calificar Exámenes
        </h1>

        <p className="text-gray-600 mb-6 text-center">
          Subir y calificar exámenes con procesamiento distribuido MPI
        </p>

        {/* Estado del servidor */}
        {serverStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg w-full">
            <p className="text-blue-700 text-center font-medium">
              {serverStatus}
            </p>
            {examCount > 0 && (
              <p className="text-blue-600 text-center text-sm">
                Exámenes a procesar: {examCount}
              </p>
            )}
          </div>
        )}

        {/* Selector de modo de entrada */}
        <div className="flex mb-6 bg-gray-200 rounded-lg p-1">
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              uploadMode === "manual"
                ? "bg-[#257085] text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setUploadMode("manual")}
          >
            ✏️ Entrada Manual
          </button>
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              uploadMode === "file"
                ? "bg-[#257085] text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setUploadMode("file")}
          >
            📁 Cargar Archivo
          </button>
        </div>

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
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded shadow-md transition-colors duration-300 disabled:opacity-50"
            onClick={handleClearAll}
            disabled={isLoading}
          >
            🗑️ Limpiar Todo
          </button>
        </div>

        {/* Entrada de datos según el modo */}
        {uploadMode === "file" ? (
          /* Modo de carga de archivo */
          <div className="flex flex-col items-center mb-4 w-full">
            <label
              htmlFor="fileInput"
              className="text-lg font-semibold mb-2 text-gray-700"
            >
              📁 Cargar Archivo JSON de Exámenes:
            </label>
            <div className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="fileInput"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="w-full p-2 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-gray-500">
                Selecciona un archivo .json con el formato de exámenes
                compatible
              </p>
            </div>
            {inputJson && (
              <div className="mt-4 w-full">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Vista previa del archivo cargado:
                </p>
                <textarea
                  className="text-black border border-gray-300 rounded-lg p-3 w-full font-mono text-xs bg-gray-50"
                  value={inputJson}
                  onChange={(e) => setInputJson(e.target.value)}
                  rows={10}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        ) : (
          /* Modo manual */
          <div className="flex flex-col items-center mb-4 w-full">
            <label
              htmlFor="inputJson"
              className="text-lg font-semibold mb-2 text-gray-700"
            >
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
        )}

        {/* Botón principal de calificación */}
        <div className="mb-6">
          <button
            className={`px-8 py-3 rounded-lg shadow-md text-white font-semibold transition-all duration-300 ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#257085] hover:bg-[#1a5a6b] hover:shadow-lg focus:shadow-lg active:shadow-lg focus:outline-none"
            }`}
            onClick={handleGradeExams}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Procesando con MPI...
              </span>
            ) : (
              "🚀 Calificar Exámenes"
            )}
          </button>
        </div>

        {/* Debug Info */}
        {lastResults && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg w-full">
            <details>
              <summary className="font-medium text-yellow-800 cursor-pointer">
                🔍 Debug: Estado de lastResults (click para expandir)
              </summary>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  <strong>Tiene student_results:</strong>{" "}
                  {lastResults.student_results ? "✅ Sí" : "❌ No"}
                </p>
                <p>
                  <strong>Es array:</strong>{" "}
                  {Array.isArray(lastResults.student_results)
                    ? "✅ Sí"
                    : "❌ No"}
                </p>
                <p>
                  <strong>Cantidad:</strong>{" "}
                  {lastResults.student_results?.length || 0} estudiantes
                </p>
                <p>
                  <strong>Tiene statistical_analysis:</strong>{" "}
                  {lastResults.statistical_analysis ? "✅ Sí" : "❌ No"}
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Cards de estadísticas generales */}
        {lastResults &&
          (lastResults.statistical_analysis ||
            lastResults.score_statistics ||
            lastResults.basic_stats) && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 w-full">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.statistical_analysis?.summary
                    .total_exams_processed ||
                    lastResults.basic_stats?.total_exams_processed ||
                    lastResults.score_statistics?.total_scored_exams ||
                    0}
                </div>
                <div className="text-sm opacity-90">Exámenes Procesados</div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.statistical_analysis?.performance_metrics
                    .average_percentage ||
                    (lastResults.score_statistics?.average_score
                      ? `${lastResults.score_statistics.average_score}`
                      : lastResults.basic_stats?.average_score
                      ? `${lastResults.basic_stats.average_score}`
                      : "N/A")}
                </div>
                <div className="text-sm opacity-90">Promedio General</div>
              </div>
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.score_statistics?.highest_score
                    ? `${lastResults.score_statistics.highest_score}`
                    : lastResults.basic_stats?.highest_score
                    ? `${lastResults.basic_stats.highest_score}`
                    : lastResults.statistical_analysis?.performance_metrics
                        ?.average_percentage
                    ? "-"
                    : "N/A"}
                </div>
                <div className="text-sm opacity-90">Puntaje Más Alto</div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.score_statistics?.lowest_score
                    ? `${lastResults.score_statistics.lowest_score}`
                    : lastResults.basic_stats?.lowest_score
                    ? `${lastResults.basic_stats.lowest_score}`
                    : lastResults.statistical_analysis?.performance_metrics
                        ?.average_percentage
                    ? "-"
                    : "N/A"}
                </div>
                <div className="text-sm opacity-90">Puntaje Más Bajo</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.processing_info?.processing_time?.slice(
                    11,
                    19
                  ) || "N/A"}
                </div>
                <div className="text-sm opacity-90">
                  Tiempo de Procesamiento
                </div>
              </div>
            </div>
          )}

        {/* Student Results Cards */}
        {lastResults &&
        lastResults.student_results &&
        Array.isArray(lastResults.student_results) &&
        lastResults.student_results.length > 0 &&
        lastResults.statistical_analysis &&
        lastResults.processing_info ? (
          <div className="mb-6 w-full">
            <h3 className="text-2xl font-bold text-[#257085] mb-6 text-center">
              📊 Resultados de Calificación del Cluster (
              {lastResults.student_results.length} estudiantes)
            </h3>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.statistical_analysis.summary.total_students}
                </div>
                <div className="text-sm opacity-90">Estudiantes Evaluados</div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {
                    lastResults.statistical_analysis.performance_metrics
                      .average_percentage
                  }
                </div>
                <div className="text-sm opacity-90">Promedio General</div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {
                    lastResults.statistical_analysis.pass_fail_analysis
                      .pass_rate
                  }
                </div>
                <div className="text-sm opacity-90">Tasa de Aprobación</div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white text-center">
                <div className="text-3xl font-bold">
                  {lastResults.processing_info.processing_time.slice(11, 19)}
                </div>
                <div className="text-sm opacity-90">
                  Tiempo de Procesamiento
                </div>
              </div>
            </div>

            {/* Distribución de calificaciones */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                📈 Distribución de Calificaciones
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(
                  lastResults.statistical_analysis.grade_distribution
                ).map(([grade, count]) => (
                  <div
                    key={grade}
                    className="text-center p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="text-2xl font-bold text-gray-700">
                      {count as number}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      {grade}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultados individuales por estudiante */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                👥 Resultados por Estudiante
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {lastResults.student_results.map(
                  (
                    student: {
                      student_id: string;
                      score: number;
                      percentage: string;
                      status: string;
                      breakdown: {
                        correct: number;
                        wrong: number;
                        unscored: number;
                      };
                      grade_letter: string;
                    },
                    index: number
                  ) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        student.status.includes("APROBADO")
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-800">
                          {student.student_id}
                        </h5>
                        <span
                          className={`text-2xl ${
                            student.status.includes("APROBADO")
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {student.status.includes("APROBADO") ? "✅" : "❌"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Puntuación:
                          </span>
                          <span className="font-bold">{student.score}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Porcentaje:
                          </span>
                          <span
                            className={`font-bold ${
                              student.status.includes("APROBADO")
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {student.percentage}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Nota:</span>
                          <span
                            className={`font-bold text-lg px-2 py-1 rounded ${
                              student.grade_letter === "A"
                                ? "bg-green-100 text-green-800"
                                : student.grade_letter === "B"
                                ? "bg-blue-100 text-blue-800"
                                : student.grade_letter === "C"
                                ? "bg-yellow-100 text-yellow-800"
                                : student.grade_letter === "D"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {student.grade_letter}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Correctas:</span>
                              <span className="text-green-600 font-medium">
                                {student.breakdown.correct}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Incorrectas:</span>
                              <span className="text-red-600 font-medium">
                                {student.breakdown.wrong}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sin calificar:</span>
                              <span className="text-gray-500 font-medium">
                                {student.breakdown.unscored}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Resumen de aprobados vs reprobados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-gradient-to-r from-green-100 to-green-200 p-6 rounded-lg border border-green-300">
                <div className="text-center">
                  <div className="text-4xl text-green-600 mb-2">✅</div>
                  <div className="text-2xl font-bold text-green-800">
                    {
                      lastResults.statistical_analysis.pass_fail_analysis
                        .passed_students
                    }
                  </div>
                  <div className="text-lg text-green-700 mb-2">
                    Estudiantes Aprobados
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    {
                      lastResults.statistical_analysis.pass_fail_analysis
                        .pass_rate
                    }{" "}
                    del total
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-100 to-red-200 p-6 rounded-lg border border-red-300">
                <div className="text-center">
                  <div className="text-4xl text-red-600 mb-2">❌</div>
                  <div className="text-2xl font-bold text-red-800">
                    {
                      lastResults.statistical_analysis.pass_fail_analysis
                        .failed_students
                    }
                  </div>
                  <div className="text-lg text-red-700 mb-2">
                    Estudiantes Reprobados
                  </div>
                  <div className="text-sm text-red-600 font-medium">
                    {
                      lastResults.statistical_analysis.pass_fail_analysis
                        .fail_rate
                    }{" "}
                    del total
                  </div>
                </div>
              </div>
            </div>

            {/* Recomendaciones */}
            {lastResults.recommendations &&
              lastResults.recommendations.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-lg font-semibold text-yellow-800 mb-3">
                    💡 Recomendaciones del Sistema
                  </h4>
                  <div className="space-y-2">
                    {lastResults.recommendations.map(
                      (rec: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start bg-white p-3 rounded border"
                        >
                          <span className="text-yellow-600 mr-3 mt-1">•</span>
                          <span className="text-yellow-700">{rec}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        ) : lastResults && lastResults.summary_only ? (
          <div className="mb-6 w-full">
            <h3 className="text-2xl font-bold text-[#257085] mb-6 text-center">
              📊 Resumen de Procesamiento Completado
            </h3>

            {/* Métricas de procesamiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white text-center">
                <div className="text-4xl text-white mb-2">✅</div>
                <div className="text-3xl font-bold">
                  {lastResults.basic_stats?.total_exams_processed || 0}
                </div>
                <div className="text-lg opacity-90">Exámenes Procesados</div>
                <div className="text-sm opacity-75 mt-2">
                  Procesamiento distribuido MPI
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white text-center">
                <div className="text-4xl text-white mb-2">🚀</div>
                <div className="text-2xl font-bold">
                  {lastResults.basic_stats?.system_status || "Operativo"}
                </div>
                <div className="text-lg opacity-90">Estado del Sistema</div>
                <div className="text-sm opacity-75 mt-2">
                  Cluster MPI funcionando
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white text-center">
                <div className="text-4xl text-white mb-2">⏱️</div>
                <div className="text-2xl font-bold">
                  {lastResults.processing_info?.processing_time?.slice(
                    11,
                    19
                  ) || "N/A"}
                </div>
                <div className="text-lg opacity-90">
                  Tiempo de Procesamiento
                </div>
                <div className="text-sm opacity-75 mt-2">
                  Respuesta del servidor
                </div>
              </div>
            </div>

            {/* Estadísticas de puntuación */}
            {lastResults.score_statistics &&
              lastResults.score_statistics.total_scored_exams > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                    📊 Estadísticas de Puntuación
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 rounded-lg text-white text-center">
                      <div className="text-3xl text-white mb-1">📈</div>
                      <div className="text-2xl font-bold">
                        {lastResults.score_statistics.average_score}
                      </div>
                      <div className="text-sm opacity-90">Puntaje Promedio</div>
                      <div className="text-xs opacity-75 mt-1">
                        {lastResults.score_statistics.total_scored_exams}{" "}
                        exámenes calificados
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-lg text-white text-center">
                      <div className="text-3xl text-white mb-1">🏆</div>
                      <div className="text-2xl font-bold">
                        {lastResults.score_statistics.highest_score}
                      </div>
                      <div className="text-sm opacity-90">Puntaje Más Alto</div>
                      <div className="text-xs opacity-75 mt-1">
                        Mejor resultado
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white text-center">
                      <div className="text-3xl text-white mb-1">📉</div>
                      <div className="text-2xl font-bold">
                        {lastResults.score_statistics.lowest_score}
                      </div>
                      <div className="text-sm opacity-90">Puntaje Más Bajo</div>
                      <div className="text-xs opacity-75 mt-1">
                        Resultado mínimo
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Información del procesamiento */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                ℹ️ Detalles del Procesamiento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exámenes enviados:</span>
                    <span className="font-medium">
                      {lastResults.basic_stats?.total_exams_processed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Estado del procesamiento:
                    </span>
                    <span className="text-green-600 font-medium">
                      ✅ Completado
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Respuesta del servidor:
                    </span>
                    <span className="font-medium">
                      {lastResults.processing_info?.server_response}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arquitectura:</span>
                    <span className="font-medium">MPI Distribuido</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protocolo:</span>
                    <span className="font-medium">ScoreHive (SH)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sistema:</span>
                    <span className="text-green-600 font-medium">
                      {lastResults.basic_stats?.system_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nota explicativa */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-3">
                📋 Información del Cluster
              </h4>
              <p className="text-blue-700 mb-3">{lastResults.cluster_note}</p>
              <div className="text-sm text-blue-600 space-y-1">
                <p>
                  • Los exámenes fueron procesados exitosamente por el cluster
                  MPI
                </p>
                <p>• El sistema está funcionando correctamente</p>
                <p>• El procesamiento distribuido se completó sin errores</p>
                <p>
                  • Los resultados detallados pueden estar disponibles en
                  versiones futuras
                </p>
              </div>
            </div>
          </div>
        ) : lastResults ? (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg w-full">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">
              ⚠️ Resultados recibidos pero sin datos de estudiantes
            </h3>
            <p className="text-orange-700">
              Se recibió una respuesta del servidor pero no contiene datos
              válidos de estudiantes para mostrar. Revisa la respuesta JSON
              completa abajo para más detalles.
            </p>
          </div>
        ) : null}

        {/* Response JSON - Solo visible en modo debug */}
        {responseJson && (
          <div className="w-full">
            <details className="w-full">
              <summary className="cursor-pointer p-3 bg-gray-100 rounded-t-lg font-medium text-gray-700 hover:bg-gray-200">
                🔍 Ver respuesta JSON completa (solo para debug)
              </summary>
              <div className="border border-gray-300 border-t-0 rounded-b-lg">
                <div className="w-full relative">
                  <textarea
                    className="text-black border-0 p-3 w-full font-mono text-xs bg-gray-50 resize-none"
                    value={responseJson}
                    readOnly
                    rows={15}
                    placeholder="Aquí aparecerán los resultados del servidor..."
                  />
                  {responseJson && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                        onClick={() =>
                          navigator.clipboard.writeText(responseJson)
                        }
                        title="Copiar respuesta"
                      >
                        📋
                      </button>
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                        onClick={() => {
                          const blob = new Blob([responseJson], {
                            type: "application/json",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `scorehive-results-${new Date()
                            .toISOString()
                            .slice(0, 19)
                            .replace(/:/g, "-")}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        title="Descargar como JSON"
                      >
                        💾
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg w-full">
          <h3 className="font-semibold text-blue-800 mb-2">
            ℹ️ Información sobre Carga de Exámenes:
          </h3>
          <div className="text-blue-700 text-sm space-y-1">
            <p>
              <strong>Carga manual:</strong> Copia y pega el JSON directamente
              en el área de texto
            </p>
            <p>
              <strong>Carga de archivo:</strong> Selecciona un archivo .json
              desde tu computadora
            </p>
            <p>
              <strong>Protocolo:</strong> ScoreHive Protocol (SH) - Comunicación
              TCP optimizada
            </p>
            <p>
              <strong>Capacidad:</strong> Procesa miles de exámenes
              simultáneamente
            </p>
            <p>
              <strong>Análisis:</strong> Estadísticas completas, distribución de
              notas, recomendaciones
            </p>
            <p>
              <strong>Flujo:</strong> Frontend → Adapter → Cluster MPI → Workers
              → Resultados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
