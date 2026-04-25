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

app.post('/aulas', async (req, res) => {
  try {
    const {
      aluno_id,
      instrutor_id,
      veiculo_id,
      pacote_id,
      data_hora,
      duracao,
      valor
    } = req.body;

    const result = await pool.query(`
      INSERT INTO habilitaplus.aulas
      (aluno_id, instrutor_id, veiculo_id, pacote_id, data_hora, duracao, valor, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente')
      RETURNING *
    `, [
      aluno_id,
      instrutor_id || null,
      veiculo_id || null,
      pacote_id || null,
      data_hora,
      duracao || 50,
      valor || null
    ]);

    res.status(201).json({
      status: 'ok',
      mensagem: 'Aula criada no banco com sucesso',
      aula: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});

app.put('/aulas/:id/aceitar', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { instrutor_id } = req.body;

    const result = await pool.query(`
  UPDATE habilitaplus.aulas
  SET 
    status = 'aceita',
    instrutor_id = $1,
    repasse_instrutor = valor * 0.70,
    repasse_app = valor * 0.30
  WHERE id = $2
    AND valor IS NOT NULL
  RETURNING *
`, [instrutor_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'erro',
        mensagem: 'Aula não encontrada'
      });
    }

    res.json({
      status: 'ok',
      mensagem: 'Aula aceita com sucesso',
      aula: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});

app.put('/aulas/:id/concluir', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(`
      UPDATE habilitaplus.aulas
      SET status = 'concluida'
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'erro',
        mensagem: 'Aula não encontrada'
      });
    }

    res.json({
      status: 'ok',
      mensagem: 'Aula concluída com sucesso',
      aula: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});

export default app;
