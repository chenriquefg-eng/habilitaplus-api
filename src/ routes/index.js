import { Router } from 'express';
import instrutoresRoutes from './instrutores.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

router.use('/instrutores', instrutoresRoutes);

export default router;
