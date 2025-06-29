import { Request, Response } from "express";
import { ExamService } from "../services/ExamService";
import { GradeRequest, ApiResponse, HealthResponse } from "../types";

export class ExamController {
  private examService: ExamService;
  private startTime: number;

  constructor(examService: ExamService) {
    this.examService = examService;
    this.startTime = Date.now();
  }

  /**
   * Endpoint principal para Next.js - POST /grade
   * Ahora usa procesamiento asíncrono con chunks
   */
  async grade(req: Request, res: Response): Promise<void> {
    try {
      const { host = "localhost", port = 8080, exams }: GradeRequest = req.body;

      if (!exams || !Array.isArray(exams)) {
        res.status(400).json({
          success: false,
          error: 'Se requiere un array de "exams"',
          example: {
            host: "localhost",
            port: 8080,
            exams: [
              {
                student_id: "12345",
                exam_id: "E001",
                answers: ["A", "B", "C", "D", "A"],
              },
            ],
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      // Siempre usar procesamiento asíncrono para requests al cluster
      // El cluster encola y procesa de forma asíncrona
      const result = await this.examService.gradeExamsAsync(host, port, exams);
      res.json(result);
    } catch (error) {
      console.error("❌ Error en evaluación:", (error as Error).message);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * GET /status/:requestId - Consultar estado de request
   */
  async getRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        res.status(400).json({
          success: false,
          error: "Missing request ID in parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const status = await this.examService.getRequestStatus(requestId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: "Request not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calcular progreso
      const progressPercentage = status.total_exams > 0 
        ? Math.round(((status.processed_exams + status.failed_exams) / status.total_exams) * 100)
        : 0;

      const chunksProgressPercentage = status.chunks_total > 0
        ? Math.round((status.chunks_completed / status.chunks_total) * 100)
        : 0;

      res.json({
        success: true,
        request_id: requestId,
        status: status.status,
        progress: {
          exams: {
            total: status.total_exams,
            processed: status.processed_exams,
            failed: status.failed_exams,
            percentage: progressPercentage
          },
          chunks: {
            total: status.chunks_total,
            completed: status.chunks_completed,
            percentage: chunksProgressPercentage
          }
        },
        timestamps: {
          created_at: status.created_at,
          updated_at: status.updated_at,
          completed_at: status.completed_at
        },
        error_message: status.error_message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error consultando estado:", (error as Error).message);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /health - Estado del servidor
   */
  health(_req: Request, res: Response): void {
    const uptime = (Date.now() - this.startTime) / 1000;

    res.json({
      status: "healthy",
      protocol: "SH",
      uptime: uptime,
      timestamp: new Date().toISOString(),
      connections: 0, // TODO: Get from TCPPool
      commands: [0, 1, 2, 3, 4] as number[],
    } as HealthResponse);
  }

  /**
   * GET / - Documentación de la API
   */
  documentation(_req: Request, res: Response): void {
    res.json({
      name: "ScoreHive Adapter API",
      version: "2.0.0",
      description: "HTTP-to-TCP Protocol Adapter para el sistema distribuido ScoreHive",
      protocol_format: "SH <command> <length> <data>$",
      
      // Endpoints principales
      exam_endpoints: {
        "POST /grade": {
          description: "🎯 Endpoint principal - Evaluar exámenes en el cluster",
          method: "POST",
          body: {
            host: "localhost (opcional)",
            port: "8080 (opcional)", 
            exams: [
              {
                student_id: "string",
                exam_id: "string",
                answers: ["A", "B", "C", "D"]
              }
            ]
          },
          response: "Resultados de evaluación del cluster MPI"
        },
        "GET /health": {
          description: "Estado del servidor adapter",
          method: "GET",
          response: "Información de salud del sistema"
        }
      },

      // Gestión de datos
      data_management: {
        processes: {
          base_url: "/processes",
          endpoints: {
            "POST /processes": {
              description: "Crear nuevo proceso de admisión",
              body: {
                name: "string (requerido)",
                month: "number 1-12 (requerido)",
                year: "number >2000 (requerido)"
              },
              example: {
                name: "ProcesoAdmision01",
                month: 6,
                year: 2025
              }
            },
            "GET /processes": "Listar todos los procesos",
            "GET /processes/:id": "Obtener proceso por ID",
            "PUT /processes/:id": "Actualizar proceso",
            "DELETE /processes/:id": "Eliminar proceso"
          }
        },
        
        areas: {
          base_url: "/areas",
          endpoints: {
            "POST /areas": {
              description: "Crear nueva área de conocimiento", 
              body: {
                name: "string (requerido)"
              },
              example: {
                name: "Matemáticas"
              }
            },
            "GET /areas": "Listar todas las áreas",
            "GET /areas/:id": "Obtener área por ID", 
            "PUT /areas/:id": "Actualizar área",
            "DELETE /areas/:id": "Eliminar área"
          }
        },

        answers: {
          base_url: "/answers",
          endpoints: {
            "POST /answers/create": {
              description: "Crear claves de respuesta para proceso/área",
              body: {
                processId: "UUID del proceso",
                areaId: "UUID del área",
                answers: [
                  {
                    question_index: "number (índice de pregunta)",
                    right_answer_index: "number (0=A, 1=B, 2=C, 3=D)"
                  }
                ]
              },
              example: {
                processId: "245369d1-433d-498e-a813-b1c8b8b1a793",
                areaId: "69c90151-3edb-4dcb-9a95-79bdaa8b97a5", 
                answers: [
                  { question_index: 1, right_answer_index: 2 },
                  { question_index: 2, right_answer_index: 0 }
                ]
              }
            },
            "PUT /answers/update": "Actualizar claves de respuesta (reemplaza todas)",
            "DELETE /answers/delete": "Eliminar claves por proceso/área",
            "GET /answers/:processId/:areaId": "Obtener claves por proceso/área"
          }
        }
      },

      // Flujo de trabajo típico
      workflow: {
        "1": "Crear proceso con POST /processes",
        "2": "Crear áreas con POST /areas (si no existen)",
        "3": "Definir claves de respuesta con POST /answers/create",
        "4": "Evaluar exámenes con POST /grade",
        "5": "Consultar resultados desde el cluster"
      },

      // Arquitectura del sistema
      architecture: {
        components: {
          frontend: "Next.js Web Application (puerto 3000)",
          adapter: "HTTP-to-TCP Bridge (puerto 3001)", 
          cluster: "MPI Distributed Backend (puerto 8080)",
          database: "Supabase PostgreSQL"
        },
        data_flow: "Frontend → Adapter → Cluster MPI → Database → Response"
      },

      // URLs de ejemplo
      examples: {
        nextjs_integration: {
          endpoint: "POST /grade",
          url: "http://localhost:3001/grade",
          description: "Endpoint principal para integración con Next.js"
        },
        process_management: {
          create_process: "POST http://localhost:3001/processes",
          list_areas: "GET http://localhost:3001/areas",
          create_answers: "POST http://localhost:3001/answers/create"
        }
      },

      // Información adicional
      notes: {
        authentication: "No requerida en desarrollo",
        cors: "Habilitado para desarrollo frontend",
        database: "Conexión a Supabase configurada via .env",
        cluster_connection: "Configurable via host/port en /grade"
      },

      timestamp: new Date().toISOString()
    });
  }


}
