const path = require('path');
const express = require('express');
const cors = require('cors');

const { initDb, get, all, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ROTAS DA API ---

app.get('/api/company', async (req, res) => {
  try {
    const company = await get(`SELECT id, nome, url_logo FROM public.empresa LIMIT 1`);
    if (!company) return res.status(404).json({ message: 'Empresa não encontrada.' });
    res.json({ company: { id: Number(company.id), name: company.nome, logoUrl: company.url_logo } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar dados da empresa.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { nome, password, senha } = req.body;
    const senhaFinal = password || senha;

    if (!nome || !senhaFinal) {
      return res.status(400).json({ message: 'Nome e senha são obrigatórios.' });
    }

    const user = await get(
      `SELECT id, nome FROM public.usuarios WHERE nome = ? AND senha = ?`,
      [nome, senhaFinal]
    );

    if (!user) return res.status(401).json({ message: 'Nome ou senha incorretos.' });

    res.json({ user: { id: Number(user.id), name: user.nome } });
  } catch (error) {
    res.status(500).json({ message: 'Erro no login.' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const type = req.query.type || req.query.categoria || '';
    let products = type
      ? await all(`SELECT id, nome, categoria, preco, tempo_preparo, emoji FROM public.produto WHERE LOWER(categoria) = LOWER(?)`, [type])
      : await all(`SELECT id, nome, categoria, preco, tempo_preparo, emoji FROM public.produto`);

    res.json({ data: products });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar produtos.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`☕ CoffeeHouse rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao iniciar banco:', error);
    process.exit(1);
  });