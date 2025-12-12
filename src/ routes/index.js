import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

export default router;
