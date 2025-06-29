import { Request, Response } from "express";
import { ExamService } from "../services/ExamService";
import { AnswerRepository } from "../services/AnswerRepository";
import {
  GradeRequest,
  ApiResponse,
  HealthResponse,
  SHCommand,
  COMMAND_NAMES,
} from "../types";

export class ExamController {
  private examService: ExamService;
  private answerRepository: AnswerRepository;
  private startTime: number;

  constructor(examService: ExamService) {
    this.examService = examService;
    this.answerRepository = new AnswerRepository();
    this.examService = examService;
    this.startTime = Date.now();
  }

  /**
   * Endpoint principal para Next.js - POST /grade
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

      const result = await this.examService.gradeExams(host, port, exams);
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
   * GET /answers/:host/:port - Obtener claves de respuesta
   */
  async getAnswers(req: Request, res: Response): Promise<void> {
    try {
      const { host, port } = req.params;
      const response = await this.examService.getAnswers(host, parseInt(port));

      res.json({
        success: true,
        command: "GET_ANSWERS",
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error as Error, "GET_ANSWERS");
    }
  }

  /**
   * POST /answers/:host/:port - Establecer claves de respuesta
   */
  async setAnswers(req: Request, res: Response): Promise<void> {
    try {
      const { host, port } = req.params;
      const { answers } = req.body;

      if (!answers) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el campo "answers" en el body',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const response = await this.examService.setAnswers(
        host,
        parseInt(port),
        answers
      );

      res.json({
        success: true,
        command: "SET_ANSWERS",
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error as Error, "SET_ANSWERS");
    }
  }

  /**
   * POST /review/:host/:port - Procesar lote de exámenes
   */
  async review(req: Request, res: Response): Promise<void> {
    try {
      const { host, port } = req.params;
      const { exams } = req.body;

      if (!exams || !Array.isArray(exams)) {
        res.status(400).json({
          success: false,
          error: 'Se requiere un array de "exams" en el body',
          expected_format: {
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

      const result = await this.examService.gradeExams(
        host,
        parseInt(port),
        exams
      );

      res.json({
        success: true,
        command: "REVIEW",
        exams_processed: exams.length,
        results: result.results,
        response_info: {
          protocol: "SH",
          command_name: "REVIEW",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error as Error, "REVIEW");
    }
  }

  /**
   * POST /echo/:host/:port - Prueba de conectividad
   */
  async echo(req: Request, res: Response): Promise<void> {
    try {
      const { host, port } = req.params;
      const { message } = req.body;

      const data = message || "ping";
      const response = await this.examService.echo(host, parseInt(port), data);

      res.json({
        success: true,
        command: "ECHO",
        sent: data,
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error as Error, "ECHO");
    }
  }

  /**
   * POST /shutdown/:host/:port - Cierre ordenado del sistema
   */
  async shutdown(req: Request, res: Response): Promise<void> {
    try {
      const { host, port } = req.params;
      const response = await this.examService.shutdown(host, parseInt(port));

      res.json({
        success: true,
        command: "SHUTDOWN",
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error as Error, "SHUTDOWN");
    }
  }

  /**
   * POST /command/:host/:port - Comando genérico personalizable
   */
  async customCommand(req: Request, res: Response): Promise<void> {
    try {
      const { host, port } = req.params;
      const { command, data } = req.body;

      if (command === undefined || command === null) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el campo "command" (0-4)',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      if (!Object.values(SHCommand).includes(parseInt(command))) {
        res.status(400).json({
          success: false,
          error: `Comando inválido. Debe ser uno de: ${Object.values(
            SHCommand
          ).join(", ")}`,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const response = await this.examService.sendCustomCommand(
        host,
        parseInt(port),
        parseInt(command),
        data
      );

      res.json({
        success: true,
        command: COMMAND_NAMES[command] || command,
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error as Error, "CUSTOM_COMMAND");
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
      commands: Object.values(SHCommand).filter(
        (v) => typeof v === "number"
      ) as number[],
    } as HealthResponse);
  }

  /**
   * GET / - Documentación de la API
   */
  documentation(_req: Request, res: Response): void {
    res.json({
      name: "SH Protocol HTTP-to-TCP Adapter",
      version: "2.0.0",
      protocol_format: "SH <command> <length> <data>$",
      endpoints: {
        "POST /grade": "🎯 Endpoint principal para Next.js - Evaluar exámenes",
        "GET /answers/:host/:port": "Obtener claves de respuesta (GET_ANSWERS)",
        "POST /answers/:host/:port":
          "Establecer claves de respuesta (SET_ANSWERS)",
        "POST /review/:host/:port": "Procesar lote de exámenes (REVIEW)",
        "POST /echo/:host/:port": "Prueba de conectividad (ECHO)",
        "POST /shutdown/:host/:port": "Cierre ordenado del sistema (SHUTDOWN)",
        "POST /command/:host/:port":
          'Comando genérico con { command: 0-4, data: "..." }',
        "GET /health": "Estado del servidor",
        "GET /": "Esta documentación",
      },
      nextjs_usage: {
        endpoint: "POST /grade",
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
      },
      commands: SHCommand,
    });
  }

  async createAnswersByProcessArea(req: Request, res: Response): Promise<void> {
    try {
      const { processId, areaId, answers } = req.body;
      if (!processId || !areaId || !answers || !Array.isArray(answers)) {
        res.status(400).json({
          success: false,
          error: "Missing processId, areaId, or answers array in request body.",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const result = await this.answerRepository.createAnswers(
        processId,
        areaId,
        answers
      );
      res.status(201).json({
        success: true,
        message: "Answers created successfully.",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "CREATE_ANSWERS");
    }
  }

  async updateAnswersByProcessArea(req: Request, res: Response): Promise<void> {
    try {
      const { processId, areaId, answers } = req.body;
      if (!processId || !areaId || !answers || !Array.isArray(answers)) {
        res.status(400).json({
          success: false,
          error: "Missing processId, areaId, or answers array in request body.",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const result = await this.answerRepository.updateAnswers(
        processId,
        areaId,
        answers
      );
      res.json({
        success: true,
        message: "Answers updated successfully.",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "UPDATE_ANSWERS");
    }
  }

  async deleteAnswersByProcessArea(req: Request, res: Response): Promise<void> {
    try {
      const { processId, areaId } = req.body;
      if (!processId || !areaId) {
        res.status(400).json({
          success: false,
          error: "Missing processId or areaId in request body.",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const result = await this.answerRepository.deleteAnswers(
        processId,
        areaId
      );
      res.json({
        success: true,
        message: "Answers deleted successfully.",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "DELETE_ANSWERS");
    }
  }

  async getAnswersByProcessArea(req: Request, res: Response): Promise<void> {
    try {
      const { processId, areaId } = req.params;
      if (!processId || !areaId) {
        res.status(400).json({
          success: false,
          error: "Missing processId or areaId in request parameters.",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const result = await this.answerRepository.getAnswers(processId, areaId);
      res.json({
        success: true,
        message: "Answers retrieved successfully.",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "GET_ANSWERS_BY_PROCESS_AREA");
    }
  }

  private handleError(res: Response, error: Error, command: string): void {
    console.error(`Error en comando ${command}:`, error.message, "\n", error);
    res.status(500).json({
      success: false,
      command: command,
      error: error.message,
      code: (error as any).code || "UNKNOWN_ERROR",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
}
