import { Router } from 'express';
import instrutoresRoutes from './instrutores.routes.js';

const router = Router();

// rota de teste
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

// rotas do sistema
router.use('/instrutores', instrutoresRoutes);

export default router;
