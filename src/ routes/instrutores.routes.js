import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ ok: true, rota: 'instrutores' });
});

export default router;

