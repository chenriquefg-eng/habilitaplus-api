import express from 'express';
import cors from 'cors';
import pool from './db/pool.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('🚀 API HabilitaPlus rodando');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

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

export default app;
