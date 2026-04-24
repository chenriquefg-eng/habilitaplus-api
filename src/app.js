import pool from './db/pool.js';
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
  const valorInstrutor = aula.valor * 0.7;
const valorApp = aula.valor * 0.3;

aula.pagamento = {
  total: aula.valor,
  instrutor: valorInstrutor,
  app: valorApp
};
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

import pool from './db/pool.js';
app.get('/aulas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM habilitaplus.aulas
      ORDER BY id DESC
    `);

    res.json({
      status: 'ok',
      origem: 'banco_postgres',
      total: result.rows.length,
      aulas: result.rows
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
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
