import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// =============================
// 📍 INSTRUTORES
// =============================

// Listar todos os instrutores
app.get('/instrutores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habilitaplus.instrutores ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar instrutor por ID
app.get('/instrutores/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.instrutores WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Instrutor não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Criar instrutor
app.post('/instrutores', async (req, res) => {
  try {
    const { nome, telefone, ativo } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.instrutores (nome, telefone, ativo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, telefone, ativo ?? true]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar instrutor
app.put('/instrutores/:id', async (req, res) => {
  const { nome, telefone, documento, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE habilitaplus.instrutores 
       SET nome = $1, telefone = $2, documento = $3, status = $4
       WHERE id = $5 RETURNING *`,
      [nome, telefone, documento, status, req.params.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar instrutor
app.delete('/instrutores/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM habilitaplus.instrutores WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Instrutor removido com sucesso' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------
// 🔗 Conexão com o PostgreSQL
// -------------------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Testar conexão na inicialização
pool.connect()
  .then(() => console.log("🟢 Conectado ao PostgreSQL com sucesso!"))
  .catch(err => console.error("🔴 Erro ao conectar ao PostgreSQL:", err));

// Endpoint de teste da API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

// Endpoint para testar acesso ao banco
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, db_time: result.rows[0].now });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// -------------------------------
// 🚀 Subir servidor
// -------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 HabilitaPlus API rodando na porta ${PORT}`);
});
