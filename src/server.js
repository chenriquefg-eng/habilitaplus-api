import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------
// 🔗 Conexão PostgreSQL (precisa vir antes das rotas)
// ---------------------------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.connect()
  .then(() => console.log("🟢 Conectado ao PostgreSQL com sucesso!"))
  .catch(err => console.error("🔴 Erro ao conectar ao PostgreSQL:", err));

// ---------------------------------------
// 📍 ROTAS DE INSTRUTORES
// ---------------------------------------
app.get('/instrutores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habilitaplus.instrutores ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// 👉 ESTE É O POST QUE NÃO ESTAVA FUNCIONANDO
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

// ---------------------------------------
// ENDPOINTS DE TESTE
// ---------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, db_time: result.rows[0].now });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ---------------------------------------
// 🚀 SUBIR SERVIDOR
// ---------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 HabilitaPlus API rodando na porta ${PORT}`);
});
// Atualizar instrutor
app.put('/instrutores/:id', async (req, res) => {
  try {
    const { nome, telefone, ativo } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.instrutores 
       SET nome = $1, telefone = $2, ativo = $3
       WHERE id = $4
       RETURNING *`,
      [nome, telefone, ativo, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instrutor não encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Deletar instrutor
app.delete('/instrutores/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM habilitaplus.instrutores WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instrutor não encontrado" });
    }

    res.json({ message: "Instrutor removido com sucesso", deletado: result.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Filtrar instrutores ativos/inativos
app.get('/instrutores', async (req, res) => {
  try {
    const { ativo } = req.query;

    let query = 'SELECT * FROM habilitaplus.instrutores';
    let params = [];

    if (ativo !== undefined) {
      query += ' WHERE ativo = $1';
      params.push(ativo === "true");
    }

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Alterar status (ativo/inativo)
app.patch('/instrutores/:id/status', async (req, res) => {
  try {
    const { ativo } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.instrutores
       SET ativo = $1
       WHERE id = $2
       RETURNING *`,
      [ativo, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instrutor não encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =============================
// 📍 ALUNOS
// =============================

// Listar todos os alunos
app.get('/alunos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.alunos ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar aluno por ID
app.get('/alunos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.alunos WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar aluno
app.post('/alunos', async (req, res) => {
  try {
    const {
      nome,
      cpf,
      telefone,
      email,
      categoria_cnh,
      status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.alunos 
        (nome, cpf, telefone, email, categoria_cnh, status, data_cadastro)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [nome, cpf, telefone, email, categoria_cnh, status ?? 'ativo']
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar aluno
app.put('/alunos/:id', async (req, res) => {
  try {
    const {
      nome,
      cpf,
      telefone,
      email,
      categoria_cnh,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.alunos
       SET nome = $1,
           cpf = $2,
           telefone = $3,
           email = $4,
           categoria_cnh = $5,
           status = $6
       WHERE id = $7
       RETURNING *`,
      [nome, cpf, telefone, email, categoria_cnh, status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar aluno
app.delete('/alunos/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM habilitaplus.alunos WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Aluno removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

