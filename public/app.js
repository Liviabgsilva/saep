const path = require('path');
const express = require('express');
const cors = require('cors');

const {
  initDb,
  get,
  all,
  run
} = require('./db');

const app = express();

const PORT = process.env.PORT || 3000;


app.use(cors());

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);




app.get('/api/company', async (req, res) => {

  try {

    const empresa = await get(`
      SELECT
        id,
        nome,
        url_logo
      FROM public.empresa
      LIMIT 1
    `);

    if (!empresa) {

      return res.status(404).json({
        message: 'Empresa não encontrada.'
      });

    }

    res.json({
      company: {
        id: empresa.id,
        name: empresa.nome,
        logoUrl: empresa.url_logo
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar empresa.'
    });

  }

});



app.post('/api/login', async (req, res) => {

  try {

    const {
      nome,
      password,
      senha
    } = req.body;

    const senhaFinal =
      password || senha;

    if (!nome || !senhaFinal) {

      return res.status(400).json({
        message: 'Nome e senha são obrigatórios.'
      });

    }

    const usuario = await get(
      `
      SELECT
        id,
        nome
      FROM public.usuarios
      WHERE nome = ?
      AND senha = ?
      `,
      [
        nome,
        senhaFinal
      ]
    );

    if (!usuario) {

      return res.status(401).json({
        message: 'Nome ou senha incorretos.'
      });

    }

    res.json({

      message: 'Login realizado com sucesso.',

      user: {
        id: usuario.id,
        name: usuario.nome
      }

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao realizar login.'
    });

  }

});



app.get('/api/products', async (req, res) => {

  try {

    const categoria =
      req.query.category ||
      req.query.categoria ||
      '';

    let produtos;

    if (categoria) {

      produtos = await all(
        `
        SELECT
          p.id,
          p.nome,
          p.categoria,
          p.preco,
          p.tempo_preparo,
          p.emoji
        FROM public.produto p
        WHERE LOWER(p.categoria) = LOWER(?)
        ORDER BY p.id
        `,
        [categoria]
      );

    } else {

      produtos = await all(`
        SELECT
          p.id,
          p.nome,
          p.categoria,
          p.preco,
          p.tempo_preparo,
          p.emoji
        FROM public.produto p
        ORDER BY p.id
      `);

    }

    res.json({
      data: produtos
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar produtos.'
    });

  }

});




app.get('/api/products/:id', async (req, res) => {

  try {

    const id =
      Number(req.params.id);

    const produto = await get(
      `
      SELECT
        id,
        nome,
        categoria,
        preco,
        tempo_preparo,
        emoji
      FROM public.produto
      WHERE id = ?
      `,
      [id]
    );

    if (!produto) {

      return res.status(404).json({
        message: 'Produto não encontrado.'
      });

    }

    res.json({
      product: produto
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao buscar produto.'
    });

  }

});




app.post('/api/orders', async (req, res) => {

  try {

    const {
      produto_id,
      productId,
      quantidade
    } = req.body;

    const produtoId =
      Number(
        produto_id || productId
      );

    const quantidadeFinal =
      Number(
        quantidade || 1
      );

    if (!produtoId) {

      return res.status(400).json({
        message: 'Produto obrigatório.'
      });

    }

    if (quantidadeFinal <= 0) {

      return res.status(400).json({
        message: 'Quantidade inválida.'
      });

    }

  

    const produto = await get(
      `
      SELECT
        id,
        nome,
        preco
      FROM public.produto
      WHERE id = ?
      `,
      [produtoId]
    );

    if (!produto) {

      return res.status(404).json({
        message: 'Produto não encontrado.'
      });

    }

    

    const ultimoPedido = await get(`
      SELECT
        COALESCE(MAX(id), 0) + 1 AS proximo_id
      FROM public.pedidos
    `);

    const novoId =
      Number(
        ultimoPedido.proximo_id
      );

    await run(
      `
      INSERT INTO public.pedidos
      (
        id,
        produto_id,
        quantidade,
        data_pedido
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        novoId,
        produtoId,
        quantidadeFinal,
        new Date()
      ]
    );

    res.status(201).json({

      message: 'Pedido criado com sucesso.',

      order: {
        id: novoId,
        produtoId: produtoId,
        produto: produto.nome,
        quantidade: quantidadeFinal
      }

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao criar pedido.'
    });

  }

});




app.get('/api/orders', async (req, res) => {

  try {

    const pedidos = await all(`
      SELECT
        pe.id,
        pe.produto_id,
        p.nome AS produto,
        p.categoria,
        p.preco,
        p.emoji,
        pe.quantidade,
        pe.data_pedido
      FROM public.pedidos pe

      INNER JOIN public.produto p
        ON p.id = pe.produto_id

      ORDER BY pe.data_pedido DESC
    `);

    res.json({
      data: pedidos
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar pedidos.'
    });

  }

});




app.get(
  '/api/products/:id/reviews',
  async (req, res) => {

    try {

      const produtoId =
        Number(req.params.id);

      const avaliacoes = await all(
        `
        SELECT
          a.id,
          a.produto_id,
          a.nota,
          a.comentario,
          a.data_avaliacao
        FROM public.avaliacoes a

        WHERE a.produto_id = ?

        ORDER BY a.data_avaliacao DESC
        `,
        [produtoId]
      );

      res.json({
        data: avaliacoes
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: 'Erro ao carregar avaliações.'
      });

    }

  }
);




app.post(
  '/api/products/:id/reviews',
  async (req, res) => {

    try {

      const produtoId =
        Number(req.params.id);

      const {
        nota,
        comentario
      } = req.body;

      const notaFinal =
        Number(nota);

      if (
        notaFinal < 1 ||
        notaFinal > 5
      ) {

        return res.status(400).json({
          message: 'A nota deve estar entre 1 e 5.'
        });

      }

      if (
        !comentario ||
        comentario.trim().length < 2
      ) {

        return res.status(400).json({
          message: 'Comentário inválido.'
        });

      }

     

      const produto = await get(
        `
        SELECT id
        FROM public.produto
        WHERE id = ?
        `,
        [produtoId]
      );

      if (!produto) {

        return res.status(404).json({
          message: 'Produto não encontrado.'
        });

      }


      const ultimoId = await get(`
        SELECT
          COALESCE(MAX(id), 0) + 1 AS proximo_id
        FROM public.avaliacoes
      `);

      const novoId =
        Number(
          ultimoId.proximo_id
        );

   

      await run(
        `
        INSERT INTO public.avaliacoes
        (
          id,
          produto_id,
          nota,
          comentario,
          data_avaliacao
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          novoId,
          produtoId,
          notaFinal,
          comentario.trim(),
          new Date()
        ]
      );

      res.status(201).json({

        message:
          'Avaliação adicionada com sucesso.',

        review: {
          id: novoId,
          produtoId: produtoId,
          nota: notaFinal,
          comentario: comentario.trim()
        }

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: 'Erro ao criar avaliação.'
      });

    }

  }
);



app.get('/api/stats', async (req, res) => {

  try {

    const produtos =
      await get(`
        SELECT COUNT(*) AS total
        FROM public.produto
      `);

    const pedidos =
      await get(`
        SELECT COUNT(*) AS total
        FROM public.pedidos
      `);

    const avaliacoes =
      await get(`
        SELECT COUNT(*) AS total
        FROM public.avaliacoes
      `);

    res.json({

      products:
        Number(produtos.total),

      orders:
        Number(pedidos.total),

      reviews:
        Number(avaliacoes.total)

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar estatísticas.'
    });

  }

});




app.get('*', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'index.html'
    )
  );

});




initDb()

  .then(() => {

    app.listen(
      PORT,
      () => {

        console.log(
          `☕ CoffeeHouse rodando em http://localhost:${PORT}`
        );

      }
    );

  })

  .catch((error) => {

    console.error(
      'Erro ao iniciar banco:',
      error
    );

    process.exit(1);

  });