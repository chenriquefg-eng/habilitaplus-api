import pool from '../db/pool.js';

const listar = async (req, res) => {
  try {
    const { ativo } = req.query;

    let sql = 'SELECT * FROM habilitaplus.instrutores';
    const params = [];

    if (ativo !== undefined) {
      sql += ' WHERE ativo = $1';
      params.push(ativo === 'true');
    }

    sql += ' ORDER BY id';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const buscar = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habilitaplus.instrutores WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Instrutor não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const criar = async (req, res) => {
  try {
    const { nome, telefone, ativo } = req.body;

    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

    const result = await pool.query(
      `INSERT INTO habilitaplus.instrutores (nome, telefone, ativo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, telefone ?? null, ativo ?? true]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const atualizar = async (req, res) => {
  try {
    const { nome, telefone, cpf, email, categoria_habilitacao, ativo } = req.body;

    const result = await pool.query(
      `UPDATE habilitaplus.instrutores
       SET nome = COALESCE($1, nome),
           telefone = COALESCE($2, telefone),
           cpf = COALESCE($3, cpf),
           email = COALESCE($4, email),
           categoria_habilitacao = COALESCE($5, categoria_habilitacao),
           ativo = COALESCE($6, ativo)
       WHERE id = $7
       RETURNING *`,
      [
        nome ?? null,
        telefone ?? null,
        cpf ?? null,
        email ?? null,
        categoria_habilitacao ?? null,
        ativo ?? null,
        req.params.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Instrutor não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const alterarStatus = async (req, res) => {
  try {
    const { ativo } = req.body;
    if (ativo === undefined) {
      return res.status(400).json({ error: 'ativo é obrigatório (true/false)' });
    }

    const result = await pool.query(
      `UPDATE habilitaplus.instrutores
       SET ativo = $1
       WHERE id = $2
       RETURNING *`,
      [!!ativo, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Instrutor não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remover = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM habilitaplus.instrutores WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Instrutor não encontrado' });
    }

    res.json({ message: 'Instrutor removido com sucesso', deletado: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default { listar, buscar, criar, atualizar, alterarStatus, remover };

