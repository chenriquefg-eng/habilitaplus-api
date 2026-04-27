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
const dataAula = new Date(data_hora);
const agora = new Date();
const limiteMinimo = new Date(agora.getTime() + 30 * 60000);

if (isNaN(dataAula.getTime())) {
  return res.status(400).json({
    status: 'erro',
    mensagem: 'Data e hora da aula inválidas'
  });
}

if (dataAula < limiteMinimo) {
  return res.status(400).json({
    status: 'erro',
    mensagem: 'A aula precisa ser agendada com pelo menos 30 minutos de antecedência'
  });
}
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
    if (!instrutor_id) {
  return res.status(400).json({
    status: 'erro',
    mensagem: 'Informe o instrutor_id para aceitar a aula'
  });
}

    const result = await pool.query(`
  UPDATE habilitaplus.aulas
  SET 
    status = 'aceita',
    instrutor_id = $1,
    repasse_instrutor = valor * 0.70,
    repasse_app = valor * 0.30
  WHERE id = $2
    AND status = 'pendente'
    AND valor IS NOT NULL
  RETURNING *
`, [instrutor_id, id]);

   if (result.rows.length === 0) {
  return res.status(400).json({
    status: 'erro',
    mensagem: 'Aula já foi aceita por outro instrutor ou está inválida'
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
app.get('/aulas/pendentes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM habilitaplus.aulas
      WHERE status = 'pendente'
        AND valor IS NOT NULL
      ORDER BY data_hora ASC
    `);

    res.json({
      status: 'ok',
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
app.get('/instrutor', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Painel do Instrutor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f3f6fb;
      margin: 0;
      padding: 20px;
      color: #0f172a;
    }
    h1 {
      color: #0b3b75;
      margin-bottom: 5px;
    }
    .sub {
      color: #64748b;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
    }
    .linha {
      margin: 6px 0;
      font-size: 15px;
    }
    button {
      width: 100%;
      margin-top: 12px;
      padding: 14px;
      border: none;
      border-radius: 10px;
      background: #0b7cff;
      color: white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
    button:disabled {
      background: #94a3b8;
    }
  </style>
</head>
<body>
  <h1>HabilitaPlus</h1>
<div class="sub">Painel do instrutor • Aulas disponíveis</div>
  <div class="sub">Aulas disponíveis para aceitar</div>

  <div id="lista">Carregando aulas...</div>

  <script>
    const API = 'https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host';
    const INSTRUTOR_ID = 7;

    async function carregarAulas() {
      const lista = document.getElementById('lista');
      lista.innerHTML = 'Carregando aulas...';

      try {
        const resp = await fetch(API + '/aulas/pendentes');
        const data = await resp.json();

        if (!data.aulas || data.aulas.length === 0) {
          lista.innerHTML = '<p>Nenhuma aula disponível no momento.</p>';
          return;
        }

        lista.innerHTML = '';

  data.aulas.forEach(aula => {
  const card = document.createElement('div');
  card.className = 'card';

  const dataFormatada = aula.data_hora
    ? new Date(aula.data_hora.replace('Z', '')).toLocaleString('pt-BR')
    : 'Sem data';

  const valorFormatado = aula.valor
    ? Number(aula.valor).toFixed(2)
    : '0.00';

  card.innerHTML = `
    <div class="linha"><strong>Aula #${aula.id}</strong></div>
    <div class="linha">Aluno ID: ${aula.aluno_id}</div>
    <div class="linha">Data/Hora: ${dataFormatada}</div>
    <div class="linha">Duração: ${aula.duracao} minutos</div>
    <div class="linha">Valor: R$ ${valorFormatado}</div>
    <button onclick="aceitarAula(${aula.id}, this)">ACEITAR AULA</button>
  `;

  lista.appendChild(card);
});
      } catch (err) {
        lista.innerHTML = '<p>Erro ao carregar aulas.</p>';
      }
    }

    async function aceitarAula(id, botao) {
      botao.disabled = true;
      botao.innerText = 'Aceitando...';

      try {
        const resp = await fetch(API + '/aulas/' + id + '/aceitar', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instrutor_id: INSTRUTOR_ID
          })
        });

        const data = await resp.json();

        if (data.status === 'ok') {
          alert('Aula aceita com sucesso!');
          carregarAulas();
        } else {
          alert(data.mensagem || 'Não foi possível aceitar.');
          carregarAulas();
        }

      } catch (err) {
        alert('Erro ao aceitar aula.');
        carregarAulas();
      }
    }

    carregarAulas();
  </script>
</body>
</html>
  `);
});
export default app;
