import { Router } from 'express';
import { AnswerController } from '../controllers/AnswerController';

export function createAnswerRoutes(): Router {
  const router = Router();
  const answerController = new AnswerController();

  // Answer management endpoints
  router.post('/create', answerController.createAnswersByProcessArea.bind(answerController));
  router.put('/update', answerController.updateAnswersByProcessArea.bind(answerController));
  router.delete('/delete', answerController.deleteAnswersByProcessArea.bind(answerController));
  router.get('/:processId/:areaId', answerController.getAnswersByProcessArea.bind(answerController));

  return router;
}