import { Router } from 'express';
import { ProcessController } from '../controllers/ProcessController';

export function createProcessRoutes(): Router {
  const router = Router();
  const processController = new ProcessController();

  // Process CRUD endpoints
  router.post('/', processController.createProcess.bind(processController));
  router.get('/', processController.getProcesses.bind(processController));
  router.get('/:id', processController.getProcessById.bind(processController));
  router.put('/:id', processController.updateProcess.bind(processController));
  router.delete('/:id', processController.deleteProcess.bind(processController));

  return router;
}