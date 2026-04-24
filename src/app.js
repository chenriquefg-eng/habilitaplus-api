import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('🚀 API HabilitaPlus rodando');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

export default app;
app.get('/alunos', (req, res) => {
  res.json({
    status: 'ok',
    mensagem: 'Rota de alunos ativa. Use POST para cadastrar.'
  });
});
app.post('/alunos', (req, res) => {
  const aluno = req.body;

  res.status(201).json({
    status: 'ok',
    mensagem: 'Aluno cadastrado com sucesso',
    aluno
  });
});
