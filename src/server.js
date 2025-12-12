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
// =============================
// 📍 PACOTES
// =============================

// Listar todos os pacotes
app.get('/pacotes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.pacotes ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar pacote por ID
app.get('/pacotes/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.pacotes WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar novo pacote
app.post('/pacotes', async (req, res) => {
  try {
    const { nome, quantidade_aulas, valor, ativo } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.pacotes (nome, quantidade_aulas, valor, ativo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, quantidade_aulas, valor, ativo ?? true]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar pacote
app.put('/pacotes/:id', async (req, res) => {
  try {
    const { nome, quantidade_aulas, valor, ativo } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.pacotes 
       SET nome = $1, quantidade_aulas = $2, valor = $3, ativo = $4
       WHERE id = $5
       RETURNING *`,
      [nome, quantidade_aulas, valor, ativo, req.params.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar pacote
app.delete('/pacotes/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM habilitaplus.pacotes WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Pacote removido com sucesso' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -------------------------------
// 🚗 CRUD DE VEÍCULOS
// -------------------------------

// Listar veículos
app.get('/veiculos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM habilitaplus.veiculos
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar veículo por ID
app.get('/veiculos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM habilitaplus.veiculos WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Veículo não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar veículo
app.post('/veiculos', async (req, res) => {
  try {
    const { proprietario_id, instrutor_id, modelo, placa, ano, tipo, status } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.veiculos
        (proprietario_id, instrutor_id, modelo, placa, ano, tipo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        proprietario_id || null,
        instrutor_id || null,
        modelo,
        placa,
        ano,
        tipo,
        status ?? "ativo"
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar veículo
app.put('/veiculos/:id', async (req, res) => {
  try {
    const { proprietario_id, instrutor_id, modelo, placa, ano, tipo, status } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.veiculos
       SET proprietario_id = $1,
           instrutor_id = $2,
           modelo = $3,
           placa = $4,
           ano = $5,
           tipo = $6,
           status = $7
       WHERE id = $8
       RETURNING *`,
      [
        proprietario_id || null,
        instrutor_id || null,
        modelo,
        placa,
        ano,
        tipo,
        status,
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar veículo
app.delete('/veiculos/:id', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM habilitaplus.veiculos WHERE id = $1`,
      [req.params.id]
    );

    res.json({ message: "Veículo removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 👨‍🎓 ROTAS DE ALUNOS
// --------------------------------------

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
    const { nome, telefone, cpf, renach, data_nascimento, categoria } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.alunos 
       (nome, telefone, cpf, renach, data_nascimento, categoria, 
        biometria_validada, processo_ativo)
       VALUES ($1, $2, $3, $4, $5, $6, false, false)
       RETURNING *`,
      [nome, telefone, cpf, renach, data_nascimento, categoria]
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
      telefone,
      cpf,
      renach,
      data_nascimento,
      categoria,
      biometria_validada,
      processo_ativo
    } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.alunos
       SET nome=$1, telefone=$2, cpf=$3, renach=$4, data_nascimento=$5,
           categoria=$6, biometria_validada=$7, processo_ativo=$8
       WHERE id=$9
       RETURNING *`,
      [
        nome,
        telefone,
        cpf,
        renach,
        data_nascimento,
        categoria,
        biometria_validada,
        processo_ativo,
        req.params.id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar aluno
app.delete('/alunos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habilitaplus.alunos WHERE id=$1', [
      req.params.id,
    ]);
    res.json({ message: 'Aluno removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------------------------------------
// 📍 ROTAS DE PROPRIETÁRIOS
// ---------------------------------------------

// Listar todos os proprietários
app.get('/proprietarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habilitaplus.proprietarios ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar proprietário por ID
app.get('/proprietarios/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.proprietarios WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proprietário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar proprietário
app.post('/proprietarios', async (req, res) => {
  try {
    const { nome, telefone, documento, status } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.proprietarios (nome, telefone, documento, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, telefone, documento, status ?? 'ativo']
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar proprietário
app.put('/proprietarios/:id', async (req, res) => {
  try {
    const { nome, telefone, documento, status } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.proprietarios
       SET nome = $1, telefone = $2, documento = $3, status = $4
       WHERE id = $5
       RETURNING *`,
      [nome, telefone, documento, status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar proprietário
app.delete('/proprietarios/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM habilitaplus.proprietarios WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Proprietário removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 🚗 ROTAS DE VEÍCULOS
// --------------------------------------

// Listar todos os veículos
app.get('/veiculos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habilitaplus.veiculos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar veículo por ID
app.get('/veiculos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.veiculos WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar veículo
app.post('/veiculos', async (req, res) => {
  try {
    const { proprietario_id, instrutor_id, modelo, placa, ano, tipo, status } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.veiculos 
       (proprietario_id, instrutor_id, modelo, placa, ano, tipo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [proprietario_id, instrutor_id, modelo, placa, ano, tipo, status ?? 'ativo']
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar veículo
app.put('/veiculos/:id', async (req, res) => {
  try {
    const { proprietario_id, instrutor_id, modelo, placa, ano, tipo, status } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.veiculos
       SET proprietario_id = $1, instrutor_id = $2, modelo = $3, placa = $4,
           ano = $5, tipo = $6, status = $7
       WHERE id = $8 RETURNING *`,
      [proprietario_id, instrutor_id, modelo, placa, ano, tipo, status, req.params.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar veículo
app.delete('/veiculos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habilitaplus.veiculos WHERE id = $1', [
      req.params.id,
    ]);

    res.json({ message: 'Veículo removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 📆 ROTAS DE AGENDAMENTO DE AULAS
// --------------------------------------

app.post('/aulas', async (req, res) => {
  try {
    const { aluno_id, data_hora } = req.body;

    // 1. Verificar se aluno existe
    const aluno = await pool.query(
      'SELECT * FROM habilitaplus.alunos WHERE id=$1',
      [aluno_id]
    );

    if (aluno.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const dados = aluno.rows[0];

    // 2. Validações obrigatórias (LEI 6707/2024)
    if (!dados.processo_ativo) {
      return res.status(403).json({ 
        error: "Aluno não possui processo ativo no DETRAN." 
      });
    }

    if (!dados.biometria_validada) {
      return res.status(403).json({ 
        error: "Biometria do aluno não está validada. Não é permitido agendar aula." 
      });
    }

    if (!dados.renach || dados.renach.trim() === '') {
      return res.status(403).json({ 
        error: "RENACH obrigatório para realizar aulas práticas." 
      });
    }

    // 3. Criar aula pendente (instrutores vão aceitar)
    const novaAula = await pool.query(
      `INSERT INTO habilitaplus.aulas (aluno_id, data_hora, status)
       VALUES ($1, $2, 'pendente')
       RETURNING *`,
      [aluno_id, data_hora]
    );

    res.json({
      message: "Aula criada e aguardando instrutor aceitar.",
      aula: novaAula.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔍 LISTAR AULAS
app.get('/aulas', async (req, res) => {
  try {
    const aulas = await pool.query(
      `SELECT a.*, 
              al.nome AS aluno_nome,
              i.nome AS instrutor_nome,
              v.modelo AS veiculo_modelo
       FROM habilitaplus.aulas a
       LEFT JOIN habilitaplus.alunos al ON al.id = a.aluno_id
       LEFT JOIN habilitaplus.instrutores i ON i.id = a.instrutor_id
       LEFT JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id
       ORDER BY a.id DESC`
    );
    res.json(aulas.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------
// 🎓 ROTAS DE AULAS
// --------------------------------------

// Listar todas as aulas
app.get('/aulas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.aulas ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 📚 LISTAR AULAS PENDENTES (VERSÃO SIMPLES)
// --------------------------------------
app.get('/aulas/pendentes', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * 
       FROM habilitaplus.aulas
       WHERE status = 'pendente'
       ORDER BY id`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar aulas pendentes:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------
// 📋 AULAS DISPONÍVEIS PARA INSTRUTORES
// --------------------------------------
app.get('/aulas/disponiveis', async (req, res) => {
  try {
    const { autoescola_id } = req.query;

    if (!autoescola_id) {
      return res.status(400).json({ error: 'autoescola_id é obrigatório' });
    }

    const result = await pool.query(`
      SELECT 
        a.id AS aula_id,
        a.data_hora,
        a.duracao,
        al.id AS aluno_id,
        al.nome AS aluno,
        al.categoria_habilitacao
      FROM habilitaplus.aulas a
      JOIN habilitaplus.alunos al ON al.id = a.aluno_id
      WHERE a.status = 'pendente'
        AND al.processo_detran_ativo = true
        AND al.biometria_validada = true
        AND a.id NOT IN (
          SELECT aula_id 
          FROM habilitaplus.aulas_aceites
        )
      ORDER BY a.data_hora ASC
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Buscar aula por ID
app.get('/aulas/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.aulas WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aula não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar aula
app.post('/aulas', async (req, res) => {
  try {
    const {
      aluno_id,
      instrutor_id,
      veiculo_id,
      pacote_id,
      data_hora,
      duracao,
      valor,
      status,
      repasse_instrutor,
      repasse_proprietario,
      repasse_app
    } = req.body;

    const result = await pool.query(
      `INSERT INTO habilitaplus.aulas 
       (aluno_id, instrutor_id, veiculo_id, pacote_id, data_hora, duracao, valor, status,
        repasse_instrutor, repasse_proprietario, repasse_app, data_criacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        aluno_id,
        instrutor_id,
        veiculo_id,
        pacote_id,
        data_hora,
        duracao,
        valor,
        status ?? 'ativo',
        repasse_instrutor ?? 0,
        repasse_proprietario ?? 0,
        repasse_app ?? 0
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar aula
app.put('/aulas/:id', async (req, res) => {
  try {
    const {
      aluno_id,
      instrutor_id,
      veiculo_id,
      pacote_id,
      data_hora,
      duracao,
      valor,
      status,
      repasse_instrutor,
      repasse_proprietario,
      repasse_app
    } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.aulas
       SET aluno_id = $1,
           instrutor_id = $2,
           veiculo_id = $3,
           pacote_id = $4,
           data_hora = $5,
           duracao = $6,
           valor = $7,
           status = $8,
           repasse_instrutor = $9,
           repasse_proprietario = $10,
           repasse_app = $11
       WHERE id = $12
       RETURNING *`,
      [
        aluno_id,
        instrutor_id,
        veiculo_id,
        pacote_id,
        data_hora,
        duracao,
        valor,
        status,
        repasse_instrutor,
        repasse_proprietario,
        repasse_app,
        req.params.id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar aula
app.delete('/aulas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habilitaplus.aulas WHERE id = $1', [
      req.params.id,
    ]);

    res.json({ message: 'Aula removida com sucesso' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// ✅ INSTRUTOR ACEITA AULA (ATÔMICO)
// --------------------------------------
app.post('/aulas/:id/aceitar', async (req, res) => {
  const aulaId = Number(req.params.id);
  const { instrutor_id } = req.body;

  if (!instrutor_id) {
    return res.status(400).json({ error: 'instrutor_id é obrigatório' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // trava a aula
    const aula = await client.query(
      `SELECT id, instrutor_id, status
       FROM habilitaplus.aulas
       WHERE id = $1
       FOR UPDATE`,
      [aulaId]
    );

    if (aula.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Aula não encontrada' });
    }

    if (aula.rows[0].instrutor_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Aula já foi aceita por outro instrutor'
      });
    }

    const update = await client.query(
      `UPDATE habilitaplus.aulas
       SET instrutor_id = $1,
           status = 'aceita'
       WHERE id = $2
       RETURNING *`,
      [instrutor_id, aulaId]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Aula aceita com sucesso',
      aula: update.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});



// --------------------------------------
// 📊 RELATÓRIO: Aulas por Instrutor
// --------------------------------------

app.get('/relatorios/instrutor/:id', async (req, res) => {
  try {
    const instrutorId = req.params.id;
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({
        error: "Parâmetros 'inicio' e 'fim' são obrigatórios (AAAA-MM-DD)"
      });
    }

    const sql = `
      SELECT 
        i.nome AS instrutor,
        COUNT(a.id) AS total_aulas,
        COALESCE(SUM(a.repasse_instrutor), 0) AS total_instrutor,
        COALESCE(SUM(a.repasse_proprietario), 0) AS total_proprietario,
        COALESCE(SUM(a.repasse_app), 0) AS total_app,
        COALESCE(SUM(a.valor), 0) AS total_movimentado
      FROM habilitaplus.aulas a
      JOIN habilitaplus.instrutores i ON i.id = a.instrutor_id
      WHERE a.instrutor_id = $1
        AND a.data_hora BETWEEN $2 AND $3
      GROUP BY i.nome
    `;

    const result = await pool.query(sql, [
      instrutorId,
      `${inicio} 00:00:00`,
      `${fim} 23:59:59`
    ]);

    if (result.rows.length === 0) {
      return res.json({
        instrutor_id: instrutorId,
        mensagem: "Nenhuma aula encontrada no período informado.",
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 📊 RELATÓRIO: Aulas por Veículo (RESUMO)
// --------------------------------------

app.get('/relatorios/veiculo/:id', async (req, res) => {
  try {
    const veiculoId = req.params.id;
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({
        error: "Parâmetros 'inicio' e 'fim' são obrigatórios (AAAA-MM-DD)"
      });
    }

    const sql = `
      SELECT 
        v.modelo,
        v.placa,
        v.tipo,
        COUNT(a.id) AS total_aulas,
        COALESCE(SUM(a.repasse_instrutor), 0) AS total_instrutor,
        COALESCE(SUM(a.repasse_proprietario), 0) AS total_proprietario,
        COALESCE(SUM(a.repasse_app), 0) AS total_app,
        COALESCE(SUM(a.valor), 0) AS total_movimentado
      FROM habilitaplus.aulas a
      JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id
      WHERE a.veiculo_id = $1
        AND a.data_hora BETWEEN $2 AND $3
      GROUP BY v.modelo, v.placa, v.tipo
    `;

    const result = await pool.query(sql, [
      veiculoId,
      `${inicio} 00:00:00`,
      `${fim} 23:59:59`
    ]);

    if (result.rows.length === 0) {
      return res.json({
        veiculo_id: veiculoId,
        mensagem: "Nenhuma aula encontrada no período informado."
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 📊 RELATÓRIO: Aulas por Veículo (DETALHADO)
// --------------------------------------

app.get('/relatorios/veiculo/:id/detalhado', async (req, res) => {
  try {
    const veiculoId = req.params.id;
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({
        error: "Parâmetros 'inicio' e 'fim' são obrigatórios (AAAA-MM-DD)"
      });
    }

    // ------------------------
    // Totais do veículo
    // ------------------------
    const resumoSql = `
      SELECT 
        v.modelo,
        v.placa,
        v.tipo,
        COUNT(a.id) AS total_aulas,
        COALESCE(SUM(a.repasse_instrutor), 0) AS total_instrutor,
        COALESCE(SUM(a.repasse_proprietario), 0) AS total_proprietario,
        COALESCE(SUM(a.repasse_app), 0) AS total_app,
        COALESCE(SUM(a.valor), 0) AS total_movimentado
      FROM habilitaplus.aulas a
      JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id
      WHERE a.veiculo_id = $1
        AND a.data_hora BETWEEN $2 AND $3
      GROUP BY v.modelo, v.placa, v.tipo
    `;

    const resumo = await pool.query(resumoSql, [
      veiculoId,
      `${inicio} 00:00:00`,
      `${fim} 23:59:59`
    ]);

    // Nenhuma aula → retorna somente aviso
    if (resumo.rows.length === 0) {
      return res.json({
        veiculo_id: veiculoId,
        mensagem: "Nenhuma aula encontrada no período informado."
      });
    }

    // ------------------------
    // Lista detalhada das aulas
    // ------------------------
    const detalhesSql = `
      SELECT
        a.id,
        a.data_hora,
        a.valor,
        a.repasse_instrutor,
        a.repasse_proprietario,
        a.repasse_app,
        al.nome AS aluno,
        i.nome AS instrutor
      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.alunos al ON al.id = a.aluno_id
      LEFT JOIN habilitaplus.instrutores i ON i.id = a.instrutor_id
      WHERE a.veiculo_id = $1
        AND a.data_hora BETWEEN $2 AND $3
      ORDER BY a.data_hora ASC
    `;

    const detalhes = await pool.query(detalhesSql, [
      veiculoId,
      `${inicio} 00:00:00`,
      `${fim} 23:59:59`
    ]);

    // Junta tudo num JSON só
    res.json({
      ...resumo.rows[0],
      aulas: detalhes.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -------------------------------------------------------
// 📊 RELATÓRIOS FINANCEIROS
// -------------------------------------------------------

app.get('/relatorios/financeiro', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({
        error: "Você deve enviar ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD"
      });
    }

    // ---------------------------------------------
    // 1️⃣ TOTAL GERAL DO PERÍODO
    // ---------------------------------------------
    const totalGeral = await pool.query(
      `
      SELECT 
        SUM(a.valor) AS total_recebido,
        SUM(a.repasse_instrutor) AS total_instrutores,
        SUM(a.repasse_proprietario) AS total_proprietarios,
        SUM(a.repasse_app) AS total_app
      FROM habilitaplus.aulas a
      JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id
      JOIN habilitaplus.proprietarios p ON p.id = v.proprietario_id
      WHERE a.data_hora BETWEEN $1 AND $2;
      `,
      [inicio, fim]
    );

    // ---------------------------------------------
    // 2️⃣ TOTAL POR INSTRUTOR
    // ---------------------------------------------
    const porInstrutor = await pool.query(
      `
      SELECT 
        i.nome AS instrutor,
        SUM(a.valor) AS total_recebido,
        SUM(a.repasse_instrutor) AS repasse_instrutor
      FROM habilitaplus.aulas a
      JOIN habilitaplus.instrutores i ON i.id = a.instrutor_id
      WHERE a.data_hora BETWEEN $1 AND $2
      GROUP BY i.nome
      ORDER BY total_recebido DESC;
      `,
      [inicio, fim]
    );

    // ---------------------------------------------
    // 3️⃣ TOTAL POR PROPRIETÁRIO
    // ---------------------------------------------
    const porProprietario = await pool.query(
      `
      SELECT
        p.nome AS proprietario,
        SUM(a.repasse_proprietario) AS repasse_proprietario
      FROM habilitaplus.aulas a
      JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id
      JOIN habilitaplus.proprietarios p ON p.id = v.proprietario_id
      WHERE a.data_hora BETWEEN $1 AND $2
      GROUP BY p.nome
      ORDER BY repasse_proprietario DESC;
      `,
      [inicio, fim]
    );

    // ---------------------------------------------
    // 📤 RESPOSTA FINAL
    // ---------------------------------------------
    res.json({
      periodo: { inicio, fim },
      total_geral: totalGeral.rows[0],
      por_instrutor: porInstrutor.rows,
      por_proprietario: porProprietario.rows
    });

  } catch (err) {
    console.error("Erro no relatório financeiro:", err);
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 📊 RELATÓRIO DE AULAS POR ALUNO
// --------------------------------------

app.get('/relatorios/aluno/:id', async (req, res) => {
  const alunoId = req.params.id;

  try {
    const query = `
      SELECT 
        a.id AS aula_id,
        a.data_hora,
        a.duracao,
        a.valor,
        i.nome AS instrutor,
        v.modelo AS veiculo,
        p.nome AS pacote,
        a.repasse_instrutor,
        a.repasse_proprietario,
        a.repasse_app
      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.instrutores i ON a.instrutor_id = i.id
      LEFT JOIN habilitaplus.veiculos v ON a.veiculo_id = v.id
      LEFT JOIN habilitaplus.pacotes p ON a.pacote_id = p.id
      WHERE a.aluno_id = $1
      ORDER BY a.data_hora ASC
    `;

    const aulas = await pool.query(query, [alunoId]);

    const resumo = {
      total_aulas: aulas.rowCount,
      horas_total: aulas.rows.reduce((acc, aula) => acc + aula.duracao, 0),
      instrutores: [...new Set(aulas.rows.map(a => a.instrutor))],
      veiculos: [...new Set(aulas.rows.map(a => a.veiculo))],
      pacotes_usados: [...new Set(aulas.rows.map(a => a.pacote))],
    };

    res.json({
      aluno_id: alunoId,
      resumo,
      aulas: aulas.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------------------------
// 📊 RELATÓRIO POR INSTRUTOR
// --------------------------------------
app.get('/relatorios/instrutor/:id', async (req, res) => {
  try {
    const instrutorId = req.params.id;
    const { inicio, fim } = req.query;

    const result = await pool.query(
      `
      SELECT 
        i.nome AS instrutor,
        COUNT(a.id) AS total_aulas,
        SUM(a.duracao) AS total_minutos,
        SUM(a.valor) AS total_valor,
        SUM(a.repasse_instrutor) AS total_repasse_instrutor,
        SUM(a.repasse_proprietario) AS total_repasse_proprietario,
        SUM(a.repasse_app) AS total_repasse_app
      FROM habilitaplus.aulas a
      JOIN habilitaplus.instrutores i ON i.id = a.instrutor_id
      WHERE a.instrutor_id = $1
      AND a.data_hora BETWEEN $2 AND $3
      `,
      [instrutorId, inicio, fim]
    );

    const aulasDetalhadas = await pool.query(
      `
      SELECT 
        a.id,
        a.data_hora,
        a.duracao,
        a.valor,
        a.status,
        al.nome AS aluno,
        v.modelo AS veiculo,
        p.nome AS pacote,
        a.repasse_instrutor,
        a.repasse_proprietario,
        a.repasse_app
      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.alunos al ON al.id = a.aluno_id
      LEFT JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id
      LEFT JOIN habilitaplus.pacotes p ON p.id = a.pacote_id
      WHERE a.instrutor_id = $1
      AND a.data_hora BETWEEN $2 AND $3
      ORDER BY a.data_hora ASC
      `,
      [instrutorId, inicio, fim]
    );

    res.json({
      instrutor_id: instrutorId,
      periodo: { inicio, fim },
      resumo: result.rows[0],
      aulas: aulasDetalhadas.rows
    });

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

