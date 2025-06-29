import { Request, Response } from "express";
import { ProcessRepository } from "../repositories/ProcessRepository";
import { ApiResponse } from "../types";

export class ProcessController {
  private processRepository: ProcessRepository;

  constructor() {
    this.processRepository = new ProcessRepository();
  }

  async createProcess(req: Request, res: Response): Promise<void> {
    try {
      const { name, month, year } = req.body;
      
      if (!name || !month || !year) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: name, month, year",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (typeof month !== 'number' || month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          error: "Month must be a number between 1 and 12",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (typeof year !== 'number' || year < 2000) {
        res.status(400).json({
          success: false,
          error: "Year must be a number greater than 2000",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.processRepository.createProcess({
        name,
        month,
        year
      });

      res.status(201).json({
        success: true,
        message: "Process created successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "CREATE_PROCESS");
    }
  }

  async getProcesses(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.processRepository.getProcesses();

      res.json({
        success: true,
        message: "Processes retrieved successfully",
        data: result,
        count: result.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "GET_PROCESSES");
    }
  }

  async getProcessById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Missing process ID in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.processRepository.getProcessById(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "Process not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        message: "Process retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "GET_PROCESS_BY_ID");
    }
  }

  async updateProcess(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, month, year } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Missing process ID in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (month !== undefined) {
        if (typeof month !== 'number' || month < 1 || month > 12) {
          res.status(400).json({
            success: false,
            error: "Month must be a number between 1 and 12",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.month = month;
      }
      if (year !== undefined) {
        if (typeof year !== 'number' || year < 2000) {
          res.status(400).json({
            success: false,
            error: "Year must be a number greater than 2000",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.year = year;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: "No valid fields to update",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.processRepository.updateProcess(id, updateData);

      res.json({
        success: true,
        message: "Process updated successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "UPDATE_PROCESS");
    }
  }

  async deleteProcess(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Missing process ID in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.processRepository.deleteProcess(id);

      res.json({
        success: true,
        message: "Process deleted successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "DELETE_PROCESS");
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