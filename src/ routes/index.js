console.log('>> routes/index.js carregado');

import { Router } from 'express';
import instrutoresRoutes from './instrutores.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'HabilitaPlus API',
    version: '1.0'
  });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

router.use('/instrutores', instrutoresRoutes);

export default router;
