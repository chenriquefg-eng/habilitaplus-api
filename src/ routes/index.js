import { Router } from 'express';
import instrutores from './instrutores.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

router.get('/teste-rota', (req, res) => {
  res.json({ ok: true, msg: 'rota nova funcionando' });
});

router.use('/instrutores', instrutores);

export default router;

import { Router } from 'express';

const router = Router();

// rotas básicas de teste
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

export default router;
