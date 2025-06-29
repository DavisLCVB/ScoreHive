import { Router } from 'express';
import { AreaController } from '../controllers/AreaController';

export function createAreaRoutes(): Router {
  const router = Router();
  const areaController = new AreaController();

  // Area CRUD endpoints
  router.post('/', areaController.createArea.bind(areaController));
  router.get('/', areaController.getAreas.bind(areaController));
  router.get('/:id', areaController.getAreaById.bind(areaController));
  router.put('/:id', areaController.updateArea.bind(areaController));
  router.delete('/:id', areaController.deleteArea.bind(areaController));

  return router;
}