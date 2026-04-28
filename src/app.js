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

  card.innerHTML =
  "<div class='linha'><strong>Aula #" + aula.id + "</strong></div>" +
  "<div class='linha'>Aluno: " + (aula.aluno_nome || 'Não informado') + "</div>" +
  "<div class='linha'>Data/Hora: " + dataFormatada + "</div>" +
  "<div class='linha'>Duração: " + aula.duracao + " minutos</div>" +
  "<div class='linha'>Valor: R$ " + valorFormatado + "</div>" +
  "<button onclick='aceitarAula(" + aula.id + ", this)'>ACEITAR AULA</button>";
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

  <div id="mensagem" class="msg"></div>
</div>
  <script>
    const API = 'https://automatizar-marketing-habilita-plus.hhxl33.easypanel.host';

   if (!aluno_id) {
  window.location.href = '/login';
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
            data_hora: data_hora,
            duracao: duracao,
            valor: valor
          })
        });

        const data = await resp.json();

        if (data.status === 'ok') {
          mensagem.style.color = 'green';
          mensagem.innerHTML = '✅ Aula solicitada com sucesso!<br>Aguarde um instrutor aceitar.';
setTimeout(() => {
  window.location.href = '/instrutor';
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
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>HabilitaPlus - Cadastro</title>
</head>
<body style="font-family: Arial; padding:20px; background:#f3f6fb; color:#111;">

  <h2>HabilitaPlus</h2>
  <p>Cadastro do aluno</p>

  <input id="nome" placeholder="Nome completo" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="telefone" placeholder="Telefone" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="cpf" placeholder="CPF" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="email" placeholder="E-mail" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <input id="categoria_cnh" placeholder="Categoria CNH" value="B" style="display:block; margin:8px 0; padding:10px; width:280px;">
<input id="renach" placeholder="RENACH (se já tiver)" style="display:block; margin:8px 0; padding:10px; width:280px;">
  <button style="
  padding:14px;
  width:280px;
  background:#0b7cff;
  color:white;
  border:none;
  border-radius:10px;
  font-weight:bold;
">
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
  categoria_cnh: document.getElementById('categoria_cnh').value,
  renach: document.getElementById('renach').value
};

// 🔥 LIMPA O TELEFONE AQUI
dados.telefone = dados.telefone.replace(/\D/g, '');
      if (dados.telefone.length < 10) {
  mensagem.style.color = 'red';
  mensagem.innerText = 'Telefone inválido';
  return;
}

      if (!dados.nome || !dados.telefone) {
        mensagem.style.color = 'red';
        mensagem.innerText = 'Nome e telefone são obrigatórios.';
        return;
      }

      const resp = await fetch('/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      const data = await resp.json();

      if (data.status === 'ok') {
        localStorage.setItem('aluno_id', data.aluno.id);
        localStorage.setItem('aluno_nome', data.aluno.nome);

        mensagem.style.color = 'green';
        mensagem.innerText = 'Cadastro realizado com sucesso!';

        setTimeout(() => {
          window.location.href = '/aluno';
        }, 1000);
      } else {
        mensagem.style.color = 'red';
        mensagem.innerText = data.mensagem || 'Erro ao cadastrar.';
        const params = new URLSearchParams(window.location.search);
const telefoneParam = params.get('telefone');

if (telefoneParam) {
  document.getElementById('telefone').value = telefoneParam;
}
      }
    }
  </script>

</body>
</html>
  `);
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

  <button onclick="cadastrar()" style="padding:14px; width:280px; background:#0b7cff; color:white; border:none; border-radius:10px;">
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
        categoria_habilitacao: document.getElementById('categoria_habilitacao').value
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
  </script>

</body>
</html>
  `);
});
export default app;
