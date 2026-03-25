import { Router } from 'express';
import {
  listRoadmaps,
  getRoadmap,
  getRoadmapNodes,
  triggerIngestion,
  getIngestionStatus,
} from '../controllers/roadmap.controller';

const router = Router();

// Ingestion routes (must come before :id to avoid param conflict)
router.post('/ingest', triggerIngestion);
router.get('/ingestion/:id', getIngestionStatus);

// Roadmap CRUD routes
router.get('/', listRoadmaps);
router.get('/:id', getRoadmap);
router.get('/:id/nodes', getRoadmapNodes);

export default router;
