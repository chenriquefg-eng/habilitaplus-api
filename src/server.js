// ---------------------------------------
// 📦 IMPORTS
// ---------------------------------------
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

// ---------------------------------------
// 🚀 APP
// ---------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------
// 🧪 ROTAS DE TESTE (sempre depois do app)
// ---------------------------------------
app.get('/teste-rota', (req, res) => {
  res.json({ ok: true, msg: 'rota nova funcionando' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'HabilitaPlus API' });
});

// ---------------------------------------
// 🐘 POSTGRES
// ---------------------------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.connect()
  .then(() => console.log('🟢 PostgreSQL conectado'))
  .catch(err => console.error('🔴 Erro PostgreSQL:', err));

// ---------------------------------------
// 👨‍🏫 INSTRUTORES
// ---------------------------------------
app.get('/instrutores', async (req, res) => {
  const { ativo } = req.query;
  let sql = 'SELECT * FROM habilitaplus.instrutores';
  let params = [];

  if (ativo !== undefined) {
    sql += ' WHERE ativo = $1';
    params.push(ativo === 'true');
  }

  const result = await pool.query(sql, params);
  res.json(result.rows);
});

app.post('/instrutores', async (req, res) => {
  const { nome, telefone, ativo } = req.body;
  const r = await pool.query(
    `INSERT INTO habilitaplus.instrutores (nome, telefone, ativo)
     VALUES ($1,$2,$3) RETURNING *`,
    [nome, telefone, ativo ?? true]
  );
  res.json(r.rows[0]);
});

app.patch('/instrutores/:id/status', async (req, res) => {
  const { ativo } = req.body;
  const r = await pool.query(
    `UPDATE habilitaplus.instrutores SET ativo=$1 WHERE id=$2 RETURNING *`,
    [ativo, req.params.id]
  );
  res.json(r.rows[0]);
});

// ---------------------------------------
// 👨‍🎓 ALUNOS
// ---------------------------------------
app.get('/alunos', async (_, res) => {
  const r = await pool.query('SELECT * FROM habilitaplus.alunos ORDER BY id');
  res.json(r.rows);
});

app.post('/alunos', async (req, res) => {
  const {
    nome, telefone, cpf, renach, data_nascimento, categoria
  } = req.body;

  const r = await pool.query(
    `INSERT INTO habilitaplus.alunos
     (nome, telefone, cpf, renach, data_nascimento, categoria,
      biometria_validada, processo_ativo)
     VALUES ($1,$2,$3,$4,$5,$6,false,false)
     RETURNING *`,
    [nome, telefone, cpf, renach, data_nascimento, categoria]
  );
  res.json(r.rows[0]);
});

// ---------------------------------------
// 🚗 VEÍCULOS
// ---------------------------------------
app.get('/veiculos', async (_, res) => {
  const r = await pool.query('SELECT * FROM habilitaplus.veiculos ORDER BY id');
  res.json(r.rows);
});

app.post('/veiculos', async (req, res) => {
  const { proprietario_id, instrutor_id, modelo, placa, ano, tipo } = req.body;
  const r = await pool.query(
    `INSERT INTO habilitaplus.veiculos
     (proprietario_id, instrutor_id, modelo, placa, ano, tipo, status)
     VALUES ($1,$2,$3,$4,$5,$6,'ativo')
     RETURNING *`,
    [proprietario_id, instrutor_id, modelo, placa, ano, tipo]
  );
  res.json(r.rows[0]);
});

// ---------------------------------------
// 📆 AULAS – CRIAÇÃO + ACEITE ATÔMICO
// ---------------------------------------
app.post('/aulas', async (req, res) => {
  const { aluno_id, data_hora } = req.body;

  const aluno = await pool.query(
    'SELECT * FROM habilitaplus.alunos WHERE id=$1',
    [aluno_id]
  );

  if (!aluno.rows.length)
    return res.status(404).json({ error: 'Aluno não encontrado' });

  const a = aluno.rows[0];

  if (!a.processo_ativo || !a.biometria_validada || !a.renach)
    return res.status(403).json({ error: 'Aluno não apto para aulas' });

  const nova = await pool.query(
    `INSERT INTO habilitaplus.aulas (aluno_id, data_hora, status)
     VALUES ($1,$2,'pendente') RETURNING *`,
    [aluno_id, data_hora]
  );

  res.json(nova.rows[0]);
});

app.post('/aulas/aceitar/:id', async (req, res) => {
  const { instrutor_id } = req.body;
  const aulaId = Number(req.params.id);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const aula = await client.query(
      'SELECT * FROM habilitaplus.aulas WHERE id=$1 FOR UPDATE',
      [aulaId]
    );

    if (!aula.rows.length || aula.rows[0].instrutor_id)
      throw new Error('Aula indisponível');

    const r = await client.query(
      `UPDATE habilitaplus.aulas
       SET instrutor_id=$1, status='aceita'
       WHERE id=$2 RETURNING *`,
      [instrutor_id, aulaId]
    );

    await client.query('COMMIT');
    res.json(r.rows[0]);

  } catch (e) {
    await client.query('ROLLBACK');
    res.status(409).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------
// 🚀 START SERVER
// ---------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HabilitaPlus API rodando na porta ${PORT}`);
});
