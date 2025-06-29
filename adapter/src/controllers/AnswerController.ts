import { Request, Response } from "express";
import { AnswerRepository } from "../repositories/AnswerRepository";
import { ApiResponse } from "../types";


export class AnswerController {
  private answerRepository: AnswerRepository;

  constructor() {
    this.answerRepository = new AnswerRepository();
  }

  async createAnswersByProcessArea(req: Request, res: Response): Promise<void> {
    try {
      const { processId, areaId, answers } = req.body;
      
      if (!processId || !areaId || !answers || !Array.isArray(answers)) {
        res.status(400).json({
          success: false,
          error: "Missing processId, areaId, or answers array in request body",
          expected_format: {
            processId: "uuid",
            areaId: "uuid", 
            answers: [
              {
                question_index: 1,
                right_answer_index: 0
              }
            ]
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate answers format
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        if (typeof answer.question_index !== 'number' || typeof answer.right_answer_index !== 'number') {
          res.status(400).json({
            success: false,
            error: `Invalid answer format at index ${i}. Both question_index and right_answer_index must be numbers`,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const result = await this.answerRepository.createAnswers(
        processId,
        areaId,
        answers
      );

      res.status(201).json({
        success: true,
        message: "Answers created successfully",
        data: result,
        count: result.length,
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
          error: "Missing processId, areaId, or answers array in request body",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate answers format
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        if (typeof answer.question_index !== 'number' || typeof answer.right_answer_index !== 'number') {
          res.status(400).json({
            success: false,
            error: `Invalid answer format at index ${i}. Both question_index and right_answer_index must be numbers`,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const result = await this.answerRepository.updateAnswers(
        processId,
        areaId,
        answers
      );

      res.json({
        success: true,
        message: "Answers updated successfully",
        data: result,
        count: result.length,
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
          error: "Missing processId or areaId in request body",
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
        message: "Answers deleted successfully",
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
          error: "Missing processId or areaId in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.answerRepository.getAnswers(processId, areaId);

      res.json({
        success: true,
        message: "Answers retrieved successfully",
        data: result,
        count: result.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "GET_ANSWERS_BY_PROCESS_AREA");
    }
  }

  private handleError(res: Response, error: Error, operation: string): void {
    console.error(`Error in ${operation}:`, error.message);
    res.status(500).json({
      success: false,
      operation: operation,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
}