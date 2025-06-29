import express from "express";
import cors from "cors";
import { SHProtocolService } from "./services/SHProtocolService";
import { ExamService } from "./services/ExamService";
import { ExamController } from "./controllers/ExamController";
import { createExamRoutes } from "./routes/examRoutes";
import { createProcessRoutes } from "./routes/processRoutes";
import { createAreaRoutes } from "./routes/areaRoutes";
import { createAnswerRoutes } from "./routes/answerRoutes";

export class AdapterApp {
  private app: express.Application;
  private shProtocolService: SHProtocolService;
  private examService: ExamService;
  private examController: ExamController;
  private server: any;

  constructor(timeout: number = 10000) {
    this.app = express();
    this.shProtocolService = new SHProtocolService(timeout);
    this.examService = new ExamService(this.shProtocolService);
    this.examController = new ExamController(this.examService);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.text({ type: "text/plain" }));

    // Middleware de logging
    this.app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Rutas principales (exámenes y sistema)
    const examRoutes = createExamRoutes(this.examController);
    this.app.use("/", examRoutes);

    // Rutas de gestión de datos
    const processRoutes = createProcessRoutes();
    const areaRoutes = createAreaRoutes();
    const answerRoutes = createAnswerRoutes();

    this.app.use("/processes", processRoutes);
    this.app.use("/areas", areaRoutes);
    this.app.use("/answers", answerRoutes);
  }

  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log("Adapter running on port " + port);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }
    this.shProtocolService.closeAllConnections();
    console.log("[STOP] Servidor detenido");
  }
}
