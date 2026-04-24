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
app.put('/aulas/:id/aceitar', (req, res) => {
  const id = parseInt(req.params.id);

  const aula = aulas.find(a => a.id === id);

  if (!aula) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'Aula não encontrada'
    });
  }

  aula.status = 'aceita';
  aula.instrutor = req.body.instrutor || 'Não informado';

  res.json({
    status: 'ok',
    mensagem: 'Aula aceita com sucesso',
    aula
  });
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

app.get('/aulas', (req, res) => {
  res.json({
    status: 'ok',
    total: aulas.length,
    aulas
  });
});
app.put('/aulas/:id/aceitar', (req, res) => {
  const id = parseInt(req.params.id);

  const aula = aulas.find(a => a.id === id);

  if (!aula) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'Aula não encontrada'
    });
  }

  aula.status = 'aceita';
  aula.instrutor = req.body.instrutor || 'Instrutor não informado';

  res.json({
    status: 'ok',
    mensagem: 'Aula aceita com sucesso',
    aula
  });
});
app.put('/aulas/:id/concluir', (req, res) => {
  const id = parseInt(req.params.id);
  const aula = aulas.find(a => a.id === id);

  if (!aula) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'Aula não encontrada'
    });
  }

  aula.status = 'concluida';

  res.json({
    status: 'ok',
    mensagem: 'Aula concluída',
    aula
  });
});
