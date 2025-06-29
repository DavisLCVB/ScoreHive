import { Router } from 'express';
import { ExamController } from '../controllers/ExamController';

export function createExamRoutes(examController: ExamController): Router {
  const router = Router();

  // Endpoint principal para Next.js (procesamiento de exámenes)
  router.post('/grade', examController.grade.bind(examController));

  // Consultar estado de request asíncrona
  router.get('/status/:requestId', examController.getRequestStatus.bind(examController));

  // Rutas de sistema
  router.get('/health', examController.health.bind(examController));
  router.get('/', examController.documentation.bind(examController));

  return router;
}