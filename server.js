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
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/company', async (req, res) => {
  try {
    const company = await get(`
      SELECT
        id,
        nome,
        url_logo
      FROM public.empresa
      WHERE id = 1
    `);

    if (!company) {
      return res.status(404).json({
        message: 'Empresa não encontrada.'
      });
    }

    res.json({
      company: {
        id: Number(company.id),
        name: company.nome,
        logoUrl: company.url_logo
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar dados da empresa.'
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

    const senhaFinal = password || senha;

    if (!nome || !senhaFinal) {
      return res.status(400).json({
        message: 'Nome e senha são obrigatórios.'
      });
    }

    const user = await get(
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

    if (!user) {
      return res.status(401).json({
        message: 'Nome ou senha incorretos.'
      });
    }

    res.json({
      user: {
        id: Number(user.id),
        name: user.nome
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro no login.'
    });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const page = Math.max(
      Number(req.query.page || 1),
      1
    );

    const limit = Math.max(
      Number(req.query.limit || 4),
      1
    );

    const offset = (page - 1) * limit;

    const type =
      req.query.type ||
      req.query.categoria ||
      '';

    let totalRow;
    let products;

    if (type) {
      totalRow = await get(
        `
        SELECT COUNT(*) AS total
        FROM public.produto
        WHERE LOWER(categoria) = LOWER(?)
        `,
        [type]
      );

      products = await all(
        `
        SELECT
          id,
          nome,
          categoria,
          preco,
          tempo_preparo,
          emoji
        FROM public.produto
        WHERE LOWER(categoria) = LOWER(?)
        ORDER BY id DESC
        LIMIT ?
        OFFSET ?
        `,
        [
          type,
          limit,
          offset
        ]
      );

    } else {
      totalRow = await get(`
        SELECT COUNT(*) AS total
        FROM public.produto
      `);

      products = await all(
        `
        SELECT
          id,
          nome,
          categoria,
          preco,
          tempo_preparo,
          emoji
        FROM public.produto
        ORDER BY id DESC
        LIMIT ?
        OFFSET ?
        `,
        [
          limit,
          offset
        ]
      );
    }

    const total = Number(totalRow.total);

    const data = products.map((product) => {
      return {
        id: Number(product.id),
        title: product.nome,
        type: product.categoria,
        name: product.nome,
        category: product.categoria,
        time: Number(product.tempo_preparo),
        price: Number(product.preco),
        emoji: product.emoji
      };
    });

    res.json({
      data,
      page,
      limit,
      total,
      totalPages: Math.max(
        Math.ceil(total / limit),
        1
      )
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
    const id = Number(req.params.id);

    const product = await get(
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

    if (!product) {
      return res.status(404).json({
        message: 'Produto não encontrado.'
      });
    }

    res.json({
      product: {
        id: Number(product.id),
        title: product.nome,
        name: product.nome,
        type: product.categoria,
        category: product.categoria,
        time: Number(product.tempo_preparo),
        price: Number(product.preco),
        emoji: product.emoji
      }
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

    const productIdFinal = Number(
      produto_id || productId
    );

    const quantidadeFinal = Number(
      quantidade || 1
    );

    if (!productIdFinal) {
      return res.status(400).json({
        message: 'Produto obrigatório.'
      });
    }

    if (
      !Number.isInteger(quantidadeFinal) ||
      quantidadeFinal <= 0
    ) {
      return res.status(400).json({
        message: 'Quantidade inválida.'
      });
    }

    const product = await get(
      `
      SELECT
        id,
        nome,
        preco
      FROM public.produto
      WHERE id = ?
      `,
      [productIdFinal]
    );

    if (!product) {
      return res.status(404).json({
        message: 'Produto não encontrado.'
      });
    }

    const nextIdRow = await get(`
      SELECT
        COALESCE(MAX(id), 0) + 1 AS proximo_id
      FROM public.pedidos
    `);

    const nextId = Number(
      nextIdRow.proximo_id
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
        nextId,
        productIdFinal,
        quantidadeFinal,
        new Date()
      ]
    );

    res.status(201).json({
      message: 'Pedido criado com sucesso.',
      order: {
        id: nextId,
        produtoId: productIdFinal,
        produto: product.nome,
        quantidade: quantidadeFinal,
        preco: Number(product.preco)
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
    const orders = await all(`
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
      data: orders.map((order) => ({
        id: Number(order.id),
        produtoId: Number(order.produto_id),
        product: order.produto,
        category: order.categoria,
        price: Number(order.preco),
        emoji: order.emoji,
        quantity: Number(order.quantidade),
        date: order.data_pedido
      }))
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar pedidos.'
    });
  }
});

app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = Number(
      req.params.id
    );

    const reviews = await all(
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
      [productId]
    );

    res.json({
      data: reviews.map((review) => ({
        id: Number(review.id),
        productId: Number(review.produto_id),
        rating: Number(review.nota),
        comment: review.comentario,
        date: review.data_avaliacao
      }))
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar avaliações.'
    });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = Number(
      req.params.id
    );

    const {
      nota,
      rating,
      comentario,
      comment
    } = req.body;

    const notaFinal = Number(
      nota || rating
    );

    const comentarioFinal =
      comentario ||
      comment ||
      '';

    if (
      !Number.isInteger(notaFinal) ||
      notaFinal < 1 ||
      notaFinal > 5
    ) {
      return res.status(400).json({
        message: 'A nota deve estar entre 1 e 5.'
      });
    }

    if (
      comentarioFinal.trim().length < 2
    ) {
      return res.status(400).json({
        message: 'O comentário deve ter pelo menos 2 caracteres.'
      });
    }

    const product = await get(
      `
      SELECT id
      FROM public.produto
      WHERE id = ?
      `,
      [productId]
    );

    if (!product) {
      return res.status(404).json({
        message: 'Produto não encontrado.'
      });
    }

    const nextIdRow = await get(`
      SELECT
        COALESCE(MAX(id), 0) + 1 AS proximo_id
      FROM public.avaliacoes
    `);

    const nextId = Number(
      nextIdRow.proximo_id
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
        nextId,
        productId,
        notaFinal,
        comentarioFinal.trim(),
        new Date()
      ]
    );

    res.status(201).json({
      message: 'Avaliação adicionada com sucesso.',
      review: {
        id: nextId,
        productId,
        rating: notaFinal,
        comment: comentarioFinal.trim()
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro ao criar avaliação.'
    });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const products = await get(`
      SELECT COUNT(*) AS total
      FROM public.produto
    `);

    const orders = await get(`
      SELECT COUNT(*) AS total
      FROM public.pedidos
    `);

    const reviews = await get(`
      SELECT COUNT(*) AS total
      FROM public.avaliacoes
    `);

    res.json({
      products: Number(products.total),
      orders: Number(orders.total),
      reviews: Number(reviews.total)
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar estatísticas.'
    });
  }
});

app.get('/{*splat}', (req, res) => {
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
          `CoffeeHouse rodando em http://localhost:${PORT}`
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