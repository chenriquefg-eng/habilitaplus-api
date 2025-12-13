import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Lista de instrutores',
    data: []
  });
});

export default router;
