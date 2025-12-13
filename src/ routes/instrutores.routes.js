console.log('>> instrutores.routes.js carregado');

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Lista de instrutores' });
});

export default router;
