import express from 'express';
import cors from 'cors';
import { listarInstrutores } from './controllers/instrutores.controller.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/instrutores', listarInstrutores);

export default app;
