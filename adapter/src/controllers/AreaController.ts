import { Request, Response } from "express";
import { AreaRepository } from "../repositories/AreaRepository";
import { ApiResponse } from "../types";

export class AreaController {
  private areaRepository: AreaRepository;

  constructor() {
    this.areaRepository = new AreaRepository();
  }

  async createArea(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Missing or invalid name field",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.areaRepository.createArea({
        name: name.trim()
      });

      res.status(201).json({
        success: true,
        message: "Area created successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "CREATE_AREA");
    }
  }

  async getAreas(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.areaRepository.getAreas();

      res.json({
        success: true,
        message: "Areas retrieved successfully",
        data: result,
        count: result.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "GET_AREAS");
    }
  }

  async getAreaById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Missing area ID in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.areaRepository.getAreaById(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "Area not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        message: "Area retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "GET_AREA_BY_ID");
    }
  }

  async updateArea(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Missing area ID in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Missing or invalid name field",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.areaRepository.updateArea(id, {
        name: name.trim()
      });

      res.json({
        success: true,
        message: "Area updated successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "UPDATE_AREA");
    }
  }

  async deleteArea(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Missing area ID in request parameters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.areaRepository.deleteArea(id);

      res.json({
        success: true,
        message: "Area deleted successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(res, error as Error, "DELETE_AREA");
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