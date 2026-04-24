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
let aulas = [];

app.post('/aulas', (req, res) => {
  const aula = {
    id: aulas.length + 1,
    aluno: req.body.aluno,
    categoria: req.body.categoria,
    data: req.body.data,
    horario: req.body.horario,
    status: 'pendente'
  };

  aulas.push(aula);

  res.status(201).json({
    status: 'ok',
    mensagem: 'Aula criada com sucesso',
    aula
  });
});
