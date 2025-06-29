import { Router } from 'express';
import { ExamController } from '../controllers/ExamController';

export function createExamRoutes(examController: ExamController): Router {
  const router = Router();

  // Endpoint principal para Next.js
  router.post('/grade', examController.grade.bind(examController));

  // Endpoints específicos por comando SH
  router.get('/answers/:host/:port', examController.getAnswers.bind(examController));
  router.post('/answers/:host/:port', examController.setAnswers.bind(examController));
  router.post('/review/:host/:port', examController.review.bind(examController));
  router.post('/echo/:host/:port', examController.echo.bind(examController));
  router.post('/shutdown/:host/:port', examController.shutdown.bind(examController));

  // Comando genérico personalizable
  router.post('/command/:host/:port', examController.customCommand.bind(examController));

  // Rutas de sistema
  router.get('/health', examController.health.bind(examController));
  // Answer management endpoints
  router.post('/answers/create', examController.createAnswersByProcessArea.bind(examController));
  router.put('/answers/update', examController.updateAnswersByProcessArea.bind(examController));
  router.delete('/answers/delete', examController.deleteAnswersByProcessArea.bind(examController));
  router.get('/answers/:processId/:areaId', examController.getAnswersByProcessArea.bind(examController));

  router.get('/', examController.documentation.bind(examController));

  return router;
}