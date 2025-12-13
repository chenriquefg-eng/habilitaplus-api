import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// rota de teste direta (sem router)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// rota direta para testar
app.get('/instrutores', (req, res) => {
  res.json({ message: 'Lista de instrutores' });
});

export default app;
