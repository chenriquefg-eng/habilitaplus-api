import express from 'express';
import cors from 'cors';
import instrutoresRoutes from './routes/instrutores.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.use('/instrutores', instrutoresRoutes);

export default app;
