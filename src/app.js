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
app.post('/alunos', async (req, res) => {
  try {
    const {
      nome,
      cpf,
      telefone,
      email,
      categoria_cnh,
      renach
    } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Nome e telefone são obrigatórios'
      });
    }

    const result = await pool.query(`
  INSERT INTO habilitaplus.alunos
  (nome, cpf, telefone, email, categoria_cnh, status, processo_ativo, biometria_validada, renach)
  VALUES ($1, $2, $3, $4, $5, 'ativo', true, true, $6)
  RETURNING *
`, [
  nome,
  cpf || null,
  telefone,
  email || null,
  categoria_cnh || 'B',
  renach || 'TESTE123'
]);
    res.status(201).json({
      status: 'ok',
      mensagem: 'Aluno cadastrado com sucesso',
      aluno: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
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
const tipo_servico = 'aula_padrao';    
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
(aluno_id, instrutor_id, veiculo_id, pacote_id, data_hora, duracao, valor, status, tipo_servico)
VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', $8)
      RETURNING *
    `, [
      aluno_id,
      instrutor_id || null,
      veiculo_id || null,
      pacote_id || null,
      data_hora,
      duracao || 50,
      valor || null,
      tipo_servico
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

    repasse_instrutor = CASE
      WHEN tipo_servico = 'aula_padrao' THEN valor * 0.25
      WHEN tipo_servico = 'prova_carro' THEN valor * 0.15
      WHEN tipo_servico = 'prova_carro_instrutor' THEN valor * 0.25
      WHEN tipo_servico = 'prova_instrutor' THEN valor * 0.70
      ELSE valor * 0.25
    END,

    repasse_proprietario = CASE
      WHEN tipo_servico = 'aula_padrao' THEN valor * 0.55
      WHEN tipo_servico = 'prova_carro' THEN valor * 0.65
      WHEN tipo_servico = 'prova_carro_instrutor' THEN valor * 0.55
      WHEN tipo_servico = 'prova_instrutor' THEN 0
      ELSE valor * 0.55
    END,

    repasse_app = CASE
      WHEN tipo_servico = 'aula_padrao' THEN valor * 0.20
      WHEN tipo_servico = 'prova_carro' THEN valor * 0.20
      WHEN tipo_servico = 'prova_carro_instrutor' THEN valor * 0.20
      WHEN tipo_servico = 'prova_instrutor' THEN valor * 0.30
      ELSE valor * 0.20
    END

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
      SELECT 
        a.*,
        al.nome AS aluno_nome
      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.alunos al 
        ON al.id = a.aluno_id
      WHERE a.status = 'pendente'
      ORDER BY a.id DESC
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
    const INSTRUTOR_ID = localStorage.getItem('instrutor_id');

if (!INSTRUTOR_ID) {
  window.location.href = '/login-instrutor';
}

    async function carregarAulas() {
  const lista = document.getElementById('lista');

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

      card.innerHTML =
        "<div class='linha'><strong>Aula #" + aula.id + "</strong></div>" +
        "<div class='linha'>Aluno: " + (aula.aluno_nome || 'Não informado') + "</div>" +
        "<div class='linha'>Data/Hora: " + dataFormatada + "</div>" +
        "<div class='linha'>Duração: " + aula.duracao + " minutos</div>" +
        "<div class='linha'>Valor: R$ " + valorFormatado + "</div>" +
        "<button onclick='aceitarAula(" + aula.id + ", this)'>ACEITAR AULA</button>" +
        "<button onclick='verHistorico()' style='margin-top:6px; background:#64748b; color:white;'>VER HISTÓRICO</button>";

      lista.appendChild(card);
    });

  } catch (err) {
    lista.innerHTML = '<p>Erro ao carregar aulas.</p>';
  }
}

function verHistorico() {
  window.location.href = '/historico-instrutor';
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
      botao.disabled = false;
      botao.innerText = 'ACEITAR AULA';
      alert(data.mensagem || 'Erro ao aceitar aula');
    }

  } catch (err) {
    botao.disabled = false;
    botao.innerText = 'ACEITAR AULA';
    alert('Erro ao aceitar aula');
  }
}
  }
      carregarAulas();
  </script>
</body>
</html>
  `);
});

app.get('/aluno', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HabilitaPlus - Aluno</title>
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
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
    }
    label {
      display: block;
      margin-top: 12px;
      font-weight: bold;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px;
      margin-top: 6px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 15px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      margin-top: 18px;
      padding: 14px;
      border: none;
      border-radius: 10px;
      background: #0b7cff;
      color: white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
    .msg {
      margin-top: 15px;
      font-size: 14px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>HabilitaPlus</h1>
  <div class="sub">Solicitação de aula prática</div>

  <div class="card">

  <div style="margin-bottom:12px; font-weight:bold;">
    Aluno: Henrique
  </div>

  <label>Data e hora da aula</label>
  <input id="data_hora" type="datetime-local" />

  <label>Duração</label>
  <div style="margin-top:12px; font-weight:bold;">
    60 minutos
  </div>

  <div style="margin-top:12px; font-weight:bold;">
    Valor da aula: R$ 120,00
  </div>

  <button onclick="solicitarAula()">SOLICITAR AULA</button>

<button onclick="verHistorico()" style="margin-top:10px; background:#64748b; color:white;">
  VER HISTÓRICO
</button>

<div id="mensagem" class="msg"></div>
</div>
  <script>
    const API = 'https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host';

   if (!aluno_id) {
  window.location.href = '/login';
}
    function verHistorico() {
  window.location.href = '/historico-aluno';
}
    async function solicitarAula() {
      const mensagem = document.getElementById('mensagem');
      mensagem.innerText = 'Enviando solicitação...';

            const aluno_id = localStorage.getItem('aluno_id');
const aluno_nome = localStorage.getItem('aluno_nome');
      const data_hora = document.getElementById('data_hora').value;
      const duracao = 60;
      const valor = 120;

      if (!aluno_id || !data_hora || !duracao || !valor) {
        mensagem.style.color = 'red';
        mensagem.innerText = 'Preencha todos os campos.';
        return;
      }

      try {
        const resp = await fetch(API + '/aulas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
  aluno_id: aluno_id,
  veiculo_id: 6,
  data_hora: data_hora,
  duracao: duracao,
  valor: valor
})

        const data = await resp.json();

        if (data.status === 'ok') {
          mensagem.style.color = 'green';
          mensagem.innerHTML = '✅ Aula solicitada com sucesso!<br>Aguarde um instrutor aceitar.';
setTimeout(() => {
 window.location.href = '/historico-aluno';
}, 1500);
        } else {
          mensagem.style.color = 'red';
          mensagem.innerText = data.mensagem || 'Erro ao solicitar aula.';
        }

      } catch (err) {
        mensagem.style.color = 'red';
        mensagem.innerText = 'Erro de conexão com a API.';
      }
    }
  </script>
</body>
</html>
  `);
});
app.post('/login/aluno', async (req, res) => {
  try {
    const { telefone } = req.body;

    if (!telefone) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Telefone é obrigatório'
      });
    }

    const result = await pool.query(`
      SELECT id, nome, telefone, categoria_cnh, status
      FROM habilitaplus.alunos
      WHERE telefone = $1
      LIMIT 1
    `, [telefone]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'erro',
        mensagem: 'Aluno não encontrado. Faça o cadastro primeiro.'
      });
    }

    res.json({
      status: 'ok',
      mensagem: 'Login realizado com sucesso',
      aluno: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});
app.get('/login', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus - Login</title>
</head>
<body style="font-family: Arial; padding: 20px;">

  <h2>HabilitaPlus</h2>

  <input id="telefone" placeholder="Digite seu telefone" style="padding:10px; width:200px;" />
  
  <br><br>

  <button onclick="login()" style="padding:10px;">ENTRAR</button>

  <script>
    async function login() {
      const telefone = document.getElementById('telefone').value;

      const resp = await fetch('/login/aluno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefone })
      });

      const data = await resp.json();

      if (data.status === 'ok') {
        localStorage.setItem('aluno_id', data.aluno.id);
        localStorage.setItem('aluno_nome', data.aluno.nome);

        window.location.href = '/cadastro-aluno?telefone=' + telefone;
      } else {
        alert('Aluno não encontrado. Vamos fazer seu cadastro.');
window.location.href = '/cadastro-aluno';
      }
    }
  </script>

</body>
</html>
  `);
});
app.get('/cadastro-aluno', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus</title>
</head>
<body style="font-family: Arial; padding:20px; background:#f3f6fb;">

<h2>Cadastro do aluno</h2>

<input id="nome" placeholder="Nome completo" style="display:block; margin:8px 0; padding:10px; width:280px;">
<input id="telefone" placeholder="Telefone" style="display:block; margin:8px 0; padding:10px; width:280px;">
<input id="cpf" placeholder="CPF" style="display:block; margin:8px 0; padding:10px; width:280px;">
<input id="email" placeholder="E-mail" style="display:block; margin:8px 0; padding:10px; width:280px;">
<input id="categoria_cnh" value="B" style="display:block; margin:8px 0; padding:10px; width:280px;">
<input id="renach" placeholder="RENACH (se já tiver)" style="display:block; margin:8px 0; padding:10px; width:280px;">

<button id="btnCadastrar" style="padding:14px; width:280px; background:#0b7cff; color:white; border:none; border-radius:10px;">
  CADASTRAR
</button>

<p id="mensagem"></p>

<script>
const API = 'https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host';

document.getElementById('btnCadastrar').addEventListener('click', cadastrar);

async function cadastrar() {
  const mensagem = document.getElementById('mensagem');

  const dados = {
    nome: document.getElementById('nome').value,
    telefone: document.getElementById('telefone').value,
    cpf: document.getElementById('cpf').value,
    email: document.getElementById('email').value,
    categoria_cnh: document.getElementById('categoria_cnh').value,
    renach: document.getElementById('renach').value
  };

  dados.telefone = dados.telefone.replace(/\\D/g, '');

  if (!dados.nome || !dados.telefone) {
    mensagem.style.color = 'red';
    mensagem.innerText = 'Nome e telefone são obrigatórios';
    return;
  }

  try {
    const resp = await fetch(API + '/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    const data = await resp.json();

    if (data.status === 'ok') {
      localStorage.setItem('aluno_id', data.aluno.id);
      localStorage.setItem('aluno_nome', data.aluno.nome);

      mensagem.style.color = 'green';
      mensagem.innerText = 'Cadastro realizado!';

      setTimeout(() => {
        window.location.href = '/aluno';
      }, 1000);
    } else {
      mensagem.style.color = 'red';
      mensagem.innerText = data.mensagem || 'Erro ao cadastrar';
    }

  } catch (err) {
    mensagem.style.color = 'red';
    mensagem.innerText = 'Erro de conexão com servidor';
  }
}
</script>

</body>
</html>
`);
});
app.get('/instrutores', async (req, res) => {
  const result = await pool.query(`
    SELECT id, nome
    FROM habilitaplus.instrutores
    ORDER BY nome
  `);

  res.json(result.rows);
});
app.post('/instrutores', async (req, res) => {
  try {
    const {
      nome,
      cpf,
      telefone,
      email,
      categoria_habilitacao,
      autoescola_id
    } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Nome e telefone são obrigatórios'
      });
    }

    const result = await pool.query(`
      INSERT INTO habilitaplus.instrutores
      (nome, cpf, telefone, email, categoria_habilitacao, ativo, autoescola_id)
      VALUES ($1, $2, $3, $4, $5, true, $6)
      RETURNING *
    `, [
      nome,
      cpf || null,
      telefone,
      email || null,
      categoria_habilitacao || 'B',
      autoescola_id || null
    ]);

    res.status(201).json({
      status: 'ok',
      mensagem: 'Instrutor cadastrado com sucesso',
      instrutor: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});
app.post('/login/instrutor', async (req, res) => {
  try {
    const { telefone } = req.body;

    if (!telefone) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Telefone é obrigatório'
      });
    }

    const result = await pool.query(`
      SELECT id, nome, telefone, categoria_habilitacao, ativo
      FROM habilitaplus.instrutores
      WHERE telefone = $1
      LIMIT 1
    `, [telefone]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'erro',
        mensagem: 'Instrutor não encontrado. Faça o cadastro primeiro.'
      });
    }

    if (result.rows[0].ativo === false) {
      return res.status(403).json({
        status: 'erro',
        mensagem: 'Instrutor inativo. Procure a administração.'
      });
    }

    res.json({
      status: 'ok',
      mensagem: 'Login do instrutor realizado com sucesso',
      instrutor: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});
app.get('/login-instrutor', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus - Login Instrutor</title>
</head>
<body style="font-family: Arial; padding:20px; background:#f3f6fb;">

  <h2>Login do Instrutor</h2>

  <input id="telefone" placeholder="Digite seu telefone" style="padding:10px; width:280px;">
  
  <br><br>

  <button onclick="login()" style="padding:12px; width:280px; background:#0b7cff; color:white; border:none; border-radius:10px;">
    ENTRAR
  </button>

  <script>
    async function login() {
      const telefone = document.getElementById('telefone').value.replace(/\\D/g,'');

      const resp = await fetch('/login/instrutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone })
      });

      const data = await resp.json();

      if (data.status === 'ok') {
        localStorage.setItem('instrutor_id', data.instrutor.id);
        localStorage.setItem('instrutor_nome', data.instrutor.nome);

        window.location.href = '/instrutor';
      } else {
        alert('Instrutor não encontrado. Faça o cadastro.');
        window.location.href = '/cadastro-instrutor';
      }
    }
  </script>

</body>
</html>
  `);
});
app.get('/cadastro-instrutor', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus - Cadastro Instrutor</title>
</head>
<body style="font-family: Arial; padding:20px; background:#f3f6fb;">

  <h2>Cadastro de Instrutor</h2>

  <input id="nome" placeholder="Nome completo" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="telefone" placeholder="Telefone" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="cpf" placeholder="CPF" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="email" placeholder="E-mail" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="categoria_habilitacao" placeholder="Categoria (A, B...)" value="B" style="display:block; margin:8px 0; padding:10px; width:280px;">

  <button id="btnCadastrar" type="button" style="padding:14px; width:280px; background:#0b7cff; color:white; border:none; border-radius:10px; font-weight:bold;">
  CADASTRAR
</button>

  <p id="mensagem"></p>

  <script>
    async function cadastrar() {
      const mensagem = document.getElementById('mensagem');

      const dados = {
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        cpf: document.getElementById('cpf').value,
        email: document.getElementById('email').value,
        categoria_habilitacao: document.getElementById('categoria_cnh').value
      };

      // limpa telefone
      dados.telefone = dados.telefone.replace(/\\D/g, '');

      if (!dados.nome || !dados.telefone) {
        mensagem.style.color = 'red';
        mensagem.innerText = 'Nome e telefone são obrigatórios';
        return;
      }

      const resp = await fetch('/instrutores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      const data = await resp.json();

      if (data.status === 'ok') {
        localStorage.setItem('instrutor_id', data.instrutor.id);
        localStorage.setItem('instrutor_nome', data.instrutor.nome);

        mensagem.style.color = 'green';
        mensagem.innerText = 'Cadastro realizado!';

        setTimeout(() => {
          window.location.href = '/instrutor';
        }, 1000);

      } else {
        mensagem.style.color = 'red';
        mensagem.innerText = data.mensagem || 'Erro ao cadastrar';
      }
    }
    document.getElementById('btnCadastrar').addEventListener('click', cadastrar);
</script>
  </script>

</body>
</html>
  `);
});
app.put('/instrutores/:id/aprovar', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(`
      UPDATE habilitaplus.instrutores
      SET ativo = true
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'erro',
        mensagem: 'Instrutor não encontrado'
      });
    }

    res.json({
      status: 'ok',
      mensagem: 'Instrutor aprovado com sucesso',
      instrutor: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});
app.get('/aulas/aluno/:aluno_id', async (req, res) => {
  try {
    const aluno_id = parseInt(req.params.aluno_id);

    const result = await pool.query(`
      SELECT 
        a.*,
        i.nome AS instrutor_nome
      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.instrutores i 
        ON i.id = a.instrutor_id
      WHERE a.aluno_id = $1
      ORDER BY a.data_hora DESC
    `, [aluno_id]);

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
app.get('/aulas/instrutor/:instrutor_id', async (req, res) => {
  try {
    const instrutor_id = parseInt(req.params.instrutor_id);

    const result = await pool.query(`
      SELECT 
        a.*,
        al.nome AS aluno_nome
      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.alunos al 
        ON al.id = a.aluno_id
      WHERE a.instrutor_id = $1
      ORDER BY a.data_hora DESC
    `, [instrutor_id]);

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
app.get('/historico-aluno', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Histórico</title>
</head>
<body style="font-family: Arial; padding:20px;">

<h2>Minhas Aulas</h2>

<div id="lista">Carregando...</div>

<script>
const API = '${"https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host"}';
const aluno_id = localStorage.getItem('aluno_id');

if (!aluno_id) {
  window.location.href = '/login';
}
  const resp = await fetch(API + '/aulas/aluno/' + aluno_id);
  const data = await resp.json();
  aulasCache = data.aulas;
  

  if (!data.aulas.length) {
    lista.innerHTML = 'Nenhuma aula encontrada';
    return;
  }

  lista.innerHTML = '';

  data.aulas.forEach(aula => {
    const div = document.createElement('div');
    div.style.marginBottom = '10px';

    const dataFormatada = aula.data_hora
      ? new Date(aula.data_hora).toLocaleString('pt-BR')
      : '';

    div.innerHTML =
      "<strong>" + dataFormatada + "</strong><br>" +
      'Instrutor: ' + (aula.instrutor_nome || 'Aguardando instrutor aceitar')
     "Status: " + (aula.status === 'aceita' ? 'Confirmada' : 'Pendente')

    lista.appendChild(div);
  });
}

carregar();
</script>

</body>
</html>
  `);
});
app.get('/historico-instrutor', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus - Histórico Instrutor</title>
</head>
<body style="font-family: Arial; padding:20px; background:#f3f6fb; color:#111;">

<h2>Minhas Aulas como Instrutor</h2>

<div id="lista">Carregando...</div>

<script>
const API = 'https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host';
const instrutor_id = localStorage.getItem('instrutor_id');

if (!instrutor_id) {
  window.location.href = '/login-instrutor';
}

async function carregar() {
  const lista = document.getElementById('lista');

  try {
    const resp = await fetch(API + '/aulas/instrutor/' + instrutor_id);
    const data = await resp.json();

    if (!data.aulas || data.aulas.length === 0) {
      lista.innerHTML = '<p>Nenhuma aula encontrada.</p>';
      return;
    }

    lista.innerHTML = '';

    data.aulas.forEach(aula => {
      const div = document.createElement('div');
      div.style.background = 'white';
      div.style.padding = '14px';
      div.style.marginBottom = '10px';
      div.style.borderRadius = '12px';
      div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';

      const dataFormatada = aula.data_hora
        ? new Date(aula.data_hora.replace('Z', '')).toLocaleString('pt-BR')
        : '';

      const valor = aula.valor ? Number(aula.valor).toFixed(2) : '0.00';
      const ganho = aula.repasse_instrutor ? Number(aula.repasse_instrutor).toFixed(2) : '0.00';

      div.innerHTML =
        '<strong>' + dataFormatada + '</strong><br>' +
        'Aluno: ' + (aula.aluno_nome || 'Não informado') + '<br>' +
        'Status: ' + aula.status + '<br>' +
        'Valor da aula: R$ ' + valor + '<br>' +
        'Meu ganho: R$ ' + ganho;

      lista.appendChild(div);
    });

  } catch (err) {
    lista.innerHTML = '<p>Erro ao carregar histórico.</p>';
  }
}

carregar();
</script>

</body>
</html>
  `);
});
app.post('/autoescolas', async (req, res) => {
  try {
    const { nome, cnpj, telefone } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Nome e telefone são obrigatórios'
      });
    }

    const result = await pool.query(`
      INSERT INTO habilitaplus.autoescolas
      (nome, cnpj, telefone, status)
      VALUES ($1, $2, $3, 'ativa')
      RETURNING *
    `, [
      nome,
      cnpj || null,
      telefone
    ]);

    res.status(201).json({
      status: 'ok',
      mensagem: 'Autoescola cadastrada com sucesso',
      autoescola: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      status: 'erro',
      mensagem: error.message
    });
  }
});
app.get('/cadastro-autoescola', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus - Cadastro Autoescola</title>
</head>
<body style="font-family: Arial; padding:20px; background:#f3f6fb; color:#111;">

  <h2>Cadastro de Autoescola</h2>

  <input id="nome" placeholder="Nome da autoescola" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="cnpj" placeholder="CNPJ" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="telefone" placeholder="Telefone" style="display:block; margin:8px 0; padding:10px; width:280px;">

  <button id="btnCadastrar" type="button" style="padding:14px; width:280px; background:#0b7cff; color:white; border:none; border-radius:10px; font-weight:bold;">
    CADASTRAR
  </button>

  <p id="mensagem"></p>

  <script>
    const API = 'https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host';

    document.getElementById('btnCadastrar').addEventListener('click', cadastrar);

    async function cadastrar() {
      const mensagem = document.getElementById('mensagem');

      const dados = {
        nome: document.getElementById('nome').value,
        cnpj: document.getElementById('cnpj').value.replace(/\\D/g, ''),
        telefone: document.getElementById('telefone').value.replace(/\\D/g, '')
      };

      if (!dados.nome || !dados.telefone) {
        mensagem.style.color = 'red';
        mensagem.innerText = 'Nome e telefone são obrigatórios';
        return;
      }

      try {
        const resp = await fetch(API + '/autoescolas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });

        const data = await resp.json();

        if (data.status === 'ok') {
          mensagem.style.color = 'green';
          mensagem.innerText = 'Autoescola cadastrada com sucesso!';
        } else {
          mensagem.style.color = 'red';
          mensagem.innerText = data.mensagem || 'Erro ao cadastrar';
        }
      } catch (err) {
        mensagem.style.color = 'red';
        mensagem.innerText = 'Erro de conexão com servidor';
      }
    }
  </script>

</body>
</html>
  `);
});

app.post('/proprietarios', async (req, res) => {
  try {
    const { nome, telefone, cpf_cnpj } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Nome e telefone são obrigatórios'
      });
    }

    const result = await pool.query(`
      INSERT INTO habilitaplus.proprietarios
      (nome, telefone, tipo, cpf_cnpj, status)
      VALUES ($1, $2, 'pf', $3, 'ativo')
      RETURNING *
    `, [
      nome,
      telefone,
      cpf_cnpj || null
    ]);

    res.json({
      status: 'ok',
      proprietario: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      status: 'erro',
      mensagem: err.message
    });
  }
});
app.get('/cadastro-proprietario', (req, res) => {
  res.send(`
  <h2>Cadastro Proprietário</h2>

  <input id="nome" placeholder="Nome"><br>
  <input id="telefone" placeholder="Telefone"><br>
  <input id="cpf_cnpj" placeholder="CPF ou CNPJ">

  <button onclick="cadastrar()">Cadastrar</button>

  <script>
  async function cadastrar() {
    const resp = await fetch('/proprietarios', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value
      })
    });

    const data = await resp.json();
    alert(data.status === 'ok' ? 'Cadastrado!' : data.mensagem);
  }
  </script>
  `);
});
app.post('/veiculos', async (req, res) => {
  try {
    const { proprietario_id, modelo, placa, ano, tipo } = req.body;

    if (!proprietario_id || !modelo || !placa) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Dados obrigatórios faltando'
      });
    }

    const result = await pool.query(`
  INSERT INTO habilitaplus.veiculos
  (proprietario_id, modelo, placa, ano, tipo, status)
  VALUES ($1, $2, $3, $4, $5, 'ativo')
  RETURNING *
`, [
  proprietario_id,
  modelo,
  placa,
  ano || null,
  tipo || 'carro'
]);
    res.json({
      status: 'ok',
      veiculo: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      status: 'erro',
      mensagem: err.message
    });
  }
});
app.get('/cadastro-veiculo', (req, res) => {
  res.send(`
  <h2>Cadastro Veículo</h2>

  <input id="proprietario_id" placeholder="ID do proprietário"><br>
  <input id="modelo" placeholder="Modelo"><br>
  <input id="placa" placeholder="Placa"><br>
  <select id="tipo">
  <option value="carro">Carro</option>
  <option value="moto">Moto</option>
  <option value="caminhao">Caminhão</option>
</select><br>

  <button onclick="cadastrar()">Cadastrar</button>

  <script>
  async function cadastrar() {
    const resp = await fetch('/veiculos', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
  proprietario_id: document.getElementById('proprietario_id').value,
  modelo: document.getElementById('modelo').value,
  placa: document.getElementById('placa').value,
  tipo: document.getElementById('tipo').value
})

    const data = await resp.json();
    alert(data.status === 'ok' ? 'Veículo cadastrado!' : data.mensagem);
  }
  </script>
  `);
});
app.put('/veiculos/:id/vincular-instrutor', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { instrutor_id } = req.body;

    if (!instrutor_id) {
      return res.status(400).json({
        status: 'erro',
        mensagem: 'Informe o instrutor_id'
      });
    }

    const result = await pool.query(`
      UPDATE habilitaplus.veiculos
      SET instrutor_id = $1
      WHERE id = $2
      RETURNING *
    `, [instrutor_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'erro',
        mensagem: 'Veículo não encontrado'
      });
    }

    res.json({
      status: 'ok',
      mensagem: 'Veículo vinculado ao instrutor com sucesso',
      veiculo: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      status: 'erro',
      mensagem: err.message
    });
  }
});
app.get('/admin/aulas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.data_hora,
        a.valor,
        a.status,
        a.repasse_instrutor,
        a.repasse_proprietario,
        a.repasse_app,

        al.nome AS aluno,
        i.nome AS instrutor,
        v.modelo AS veiculo

      FROM habilitaplus.aulas a
      LEFT JOIN habilitaplus.alunos al ON al.id = a.aluno_id
      LEFT JOIN habilitaplus.instrutores i ON i.id = a.instrutor_id
      LEFT JOIN habilitaplus.veiculos v ON v.id = a.veiculo_id

      ORDER BY a.id DESC
      LIMIT 50
    `);

    res.json({
      status: 'ok',
      aulas: result.rows
    });

  } catch (err) {
    res.status(500).json({
      status: 'erro',
      mensagem: err.message
    });
  }
});
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus Admin</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f8fafc;
      margin: 0;
    }

    .header {
      background: #1e293b;
      color: white;
      padding: 15px;
      font-size: 20px;
      font-weight: bold;
    }

    .container {
      padding: 15px;
    }

    .resumo {
      background: #e2e8f0;
      padding: 12px;
      border-radius: 10px;
      margin-bottom: 15px;
      font-weight: bold;
    }

    .filtros {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .filtros button {
      padding: 10px 14px;
      border: none;
      border-radius: 8px;
      background: #1e293b;
      color: white;
      font-weight: bold;
      cursor: pointer;
    }

    .card {
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: transform 0.15s ease;
    }

    .card:hover {
      transform: scale(1.01);
    }

    .card.ok {
      background: #dcfce7;
    }

    .card.pendente {
      background: #f1f5f9;
    }

    .linha {
      margin-bottom: 4px;
    }
  </style>
</head>

<body>

<div class="header">HabilitaPlus • Painel</div>

<div class="container">
  <div id="resumo" class="resumo">Carregando resumo...</div>

  <div class="filtros">
    <button onclick="filtrar('todas')">Todas</button>
    <button onclick="filtrar('pendente')">Pendentes</button>
    <button onclick="filtrar('aceita')">Confirmadas</button>
  </div>

  <div id="lista">Carregando...</div>
</div>

<script>
let filtroAtual = 'todas';
let aulasCache = [];

function filtrar(tipo) {
  filtroAtual = tipo;
  renderizar();
}
async function aceitarAula(id) {
  const instrutorId = prompt('Digite o ID do instrutor:');

  if (!instrutorId) return;

  const resp = await fetch('/aulas/' + id + '/aceitar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instrutor_id: Number(instrutorId)
    })
  });

  const data = await resp.json();

  if (data.status === 'ok') {
    alert('Aula aceita com sucesso!');
    carregar();
  } else {
    alert(data.mensagem || 'Erro ao aceitar aula');
  }
}

async function carregar() {
  try {
    const resp = await fetch('/admin/aulas');
    const data = await resp.json();

    aulasCache = data.aulas || [];
    renderizar();

  } catch (err) {
    document.getElementById('resumo').innerHTML = 'Erro ao carregar resumo';
    document.getElementById('lista').innerHTML = 'Erro: ' + err.message;
  }
}

function renderizar() {
  const lista = document.getElementById('lista');
  const resumo = document.getElementById('resumo');

  lista.innerHTML = '';

  let totalApp = 0;
  let totalInstrutor = 0;
  let totalProprietario = 0;

  aulasCache.forEach(function(a) {
    if (a.status !== 'aceita') return;

    totalApp += Number(a.repasse_app || 0);
    totalInstrutor += Number(a.repasse_instrutor || 0);
    totalProprietario += Number(a.repasse_proprietario || 0);
  });

  resumo.innerHTML =
    '<div style="display:flex; gap:20px; flex-wrap:wrap;">' +
      '<div>💰 <b>App</b><br>R$ ' + totalApp.toFixed(2) + '</div>' +
      '<div>👨‍🏫 <b>Instrutores</b><br>R$ ' + totalInstrutor.toFixed(2) + '</div>' +
      '<div>🚘 <b>Proprietários</b><br>R$ ' + totalProprietario.toFixed(2) + '</div>' +
    '</div>';

  aulasCache
    .filter(function(a) {
      if (filtroAtual === 'todas') return true;
      return a.status === filtroAtual;
    })
    .forEach(function(a) {
      const div = document.createElement('div');
      div.className = 'card ' + (a.status === 'aceita' ? 'ok' : 'pendente');

      const statusTexto = a.status === 'aceita' ? '✅ Confirmada' : '⏳ Pendente';

      div.innerHTML =
        '<div class="linha" style="font-size:18px;"><b>🚗 Aula #' + a.id + '</b></div>' +
        '<div class="linha"><b>Aluno:</b> ' + (a.aluno || '-') + '</div>' +
        '<div class="linha"><b>Instrutor:</b> ' + (a.instrutor || '-') + '</div>' +
        '<div class="linha"><b>Veículo:</b> ' + (a.veiculo || '-') + '</div>' +
        '<div class="linha"><b>Valor:</b> R$ ' + a.valor + '</div>' +
        '<div class="linha"><b>Status:</b> ' + statusTexto + '</div>' +
        '<div class="linha">💸 <b>Instrutor:</b> R$ ' + (a.repasse_instrutor || 0) + '</div>' +
        '<div class="linha">🚘 <b>Proprietário:</b> R$ ' + (a.repasse_proprietario || 0) + '</div>' +
        '<div class="linha" style="color:#16a34a;"><b>App: R$ ' + (a.repasse_app || 0) + '</b></div>' +
        (a.status === 'pendente'
          ? '<button onclick="aceitarAula(' + a.id + ')" style="margin-top:10px; padding:8px; border:none; border-radius:6px; background:#16a34a; color:white; cursor:pointer;">ACEITAR</button>'
          : '');

      lista.appendChild(div);
    });
}

carregar();
</script>

</body>
</html>
`);
});
app.get('/instrutor/:id/agenda', async (req, res) => {
  const id = parseInt(req.params.id);

  const result = await pool.query(`
    SELECT 
      a.id,
      a.data_hora,
      a.duracao,
      a.status,
      al.nome as aluno_nome,
      v.modelo as veiculo
    FROM habilitaplus.aulas a
    LEFT JOIN habilitaplus.alunos al ON a.aluno_id = al.id
    LEFT JOIN habilitaplus.veiculos v ON a.veiculo_id = v.id
    WHERE a.instrutor_id = $1
    AND a.status = 'aceita'
    ORDER BY a.data_hora ASC
  `, [id]);

  res.json({ aulas: result.rows });
});
app.get('/agenda-instrutor', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Agenda do Instrutor</title>

<style>
body { font-family: Arial; background:#f8fafc; margin:0; }
.header { background:#1e293b; color:white; padding:15px; }
.container { padding:15px; }

.card {
  background:white;
  border-radius:10px;
  padding:12px;
  margin-bottom:10px;
  box-shadow:0 2px 6px rgba(0,0,0,0.1);
}

button {
  margin-top:8px;
  padding:8px;
  border:none;
  border-radius:6px;
  background:#2563eb;
  color:white;
}
</style>
</head>

<body>

<div class="header">Agenda do Instrutor</div>

<div class="container">
  <div id="lista">Carregando...</div>
</div>

<script>

const INSTRUTOR_ID = 7; // depois vamos automatizar

async function carregar() {
  const resp = await fetch('/instrutor/' + INSTRUTOR_ID + '/agenda');
  const data = await resp.json();

  const lista = document.getElementById('lista');
  lista.innerHTML = '';

  if (!data.aulas.length) {
    lista.innerHTML = 'Sem aulas agendadas';
    return;
  }

  data.aulas.forEach(a => {
    const div = document.createElement('div');
    div.className = 'card';

    const dataFormatada = new Date(a.data_hora).toLocaleString('pt-BR');

    div.innerHTML =
      '<b>Aula #' + a.id + '</b><br>' +
      'Aluno: ' + a.aluno_nome + '<br>' +
      'Veículo: ' + (a.veiculo || '-') + '<br>' +
      'Data: ' + dataFormatada + '<br>' +
      '<button onclick="abrirAula(' + a.id + ')">ABRIR</button>';

    lista.appendChild(div);
  });
}

function abrirAula(id) {
  window.location.href = '/aula/' + id;
}

carregar();

</script>

</body>
</html>
`);
});

app.put('/aulas/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, lat, lng } = req.body;

  let query = '';
  let values = [];

  if (status === 'em_andamento') {
    query = `
      UPDATE habilitaplus.aulas
      SET status = $1, inicio_real = NOW(), inicio_lat = $2, inicio_lng = $3
      WHERE id = $4
      RETURNING *
    `;
    values = [status, lat || null, lng || null, id];
  } else if (status === 'concluida') {
    query = `
      UPDATE habilitaplus.aulas
      SET status = $1, fim_real = NOW(), fim_lat = $2, fim_lng = $3
      WHERE id = $4
      RETURNING *
    `;
    values = [status, lat || null, lng || null, id];
  } else {
    return res.status(400).json({
      status: 'erro',
      mensagem: 'Status inválido'
    });
  }

  const result = await pool.query(query, values);

  res.json({
    status: 'ok',
    aula: result.rows[0]
  });
});
app.get('/aula/:id', (req, res) => {
  const id = req.params.id;

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Aula</title>

<style>
body { font-family: Arial; background:#f8fafc; margin:0; }
.header { background:#1e293b; color:white; padding:15px; }
.container { padding:15px; }

.card {
  background:white;
  padding:15px;
  border-radius:10px;
}

button {
  width:100%;
  margin-top:10px;
  padding:12px;
  border:none;
  border-radius:8px;
  font-size:16px;
}

.btn-iniciar { background:#2563eb; color:white; }
.btn-finalizar { background:#16a34a; color:white; }
</style>
</head>

<body>

<div class="header">Aula #${id}</div>

<div class="container">
  <div class="card">
    <div id="info">Carregando...</div>

    <button class="btn-iniciar" onclick="atualizar('em_andamento')">
      INICIAR AULA
    </button>

    <button class="btn-finalizar" onclick="atualizar('concluida')">
      FINALIZAR AULA
    </button>
  </div>
</div>

<script>

const AULA_ID = ${id};

async function carregar() {
  const resp = await fetch('/admin/aulas');
  const data = await resp.json();

  const aula = data.aulas.find(a => a.id == AULA_ID);

  document.getElementById('info').innerHTML =
    'Aluno: ' + (aula.aluno || '-') + '<br>' +
    'Instrutor: ' + (aula.instrutor || '-') + '<br>' +
    'Status: ' + aula.status + '<br>' +
'Início: ' + (aula.inicio_real || '-') + '<br>' +
'Fim: ' + (aula.fim_real || '-');
}

async function atualizar(novoStatus) {
  await fetch('/aulas/' + AULA_ID + '/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: novoStatus })
  });

  alert('Status atualizado!');
  carregar();
}

carregar();

</script>

</body>
</html>
`);
});

export default app;
