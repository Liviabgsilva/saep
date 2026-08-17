const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb, get, all, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



function formatProductRow(row) {
  return {
    id: Number(row.id),

    title: row.categoria,

    type: row.categoria,

    name: row.nome,

    quantity: Number(row.quantidade || 0),

    time: Number(row.tempo_preparo || 0),

    price: Number(row.preco || 0),

    emoji: row.emoji,

    likesCount: Number(row.total_curtidas || 0),

    commentsCount: Number(row.total_comentarios || 0),

    likedByCurrentUser:
      Number(row.curtida_usuario_logado || 0) > 0
  };
}



async function getGlobalStats() {
  const stats = await get(`
    SELECT
      COUNT(*) AS total_pedidos,
      COALESCE(SUM(preco * quantidade), 0) AS total_compras
    FROM produto
  `);

  return {
    totalOrders: Number(stats.total_pedidos || 0),
    totalPurchases: Number(stats.total_compras || 0)
  };
}



async function getUserStats(userId) {
  const stats = await get(
    `
    SELECT
      COUNT(*) AS total_pedidos,
      COALESCE(SUM(preco * quantidade), 0) AS total_compras
    FROM produto
    WHERE usuario_id = ?
    `,
    [userId]
  );

  return {
    totalOrders: Number(stats.total_pedidos || 0),
    totalPurchases: Number(stats.total_compras || 0)
  };
}



app.get('/api/company', async (req, res) => {
  try {
    const company = await get(`
      SELECT
        id,
        nome,
        url_logo
      FROM empresa
      WHERE id = 1
    `);

    if (!company) {
      return res.status(404).json({
        message: 'Empresa não encontrada.'
      });
    }

    const userId = Number(req.query.userId || 0);

    const stats = userId
      ? await getUserStats(userId)
      : await getGlobalStats();

    res.json({
      company: {
        id: company.id,
        name: company.nome,
        logoUrl: company.url_logo
      },

      stats
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

    const { email, password } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        message: 'email ou senha obrigatório'
      });

    }

    const user = await get(
      `
      SELECT
        id,
        nome,
        email,
        url_foto
      FROM usuarios
      WHERE email = ?
      AND senha = ?
      `,
      [email, password]
    );

    if (!user) {

      return res.status(401).json({
        message: 'email ou senha incorreta'
      });

    }

    const stats = await getUserStats(user.id);

    res.json({

      user: {
        id: Number(user.id),
        name: user.nome,
        email: user.email,
        photoUrl: user.url_foto
      },

      stats

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

    const type = req.query.type || '';

    const currentUserId =
      Number(req.query.currentUserId || 0);

    const where = [];

    const params = [];

   

    if (type) {

      where.push('p.categoria = ?');

      params.push(type);

    }

    const whereSql = where.length
      ? `WHERE ${where.join(' AND ')}`
      : '';



    const totalRow = await get(
      `
      SELECT COUNT(*) AS total
      FROM produto p
      ${whereSql}
      `,
      params
    );



    const rows = await all(
      `
      SELECT

        p.id,

        p.nome,

        p.categoria,

        p.quantidade,

        p.tempo_preparo,

        p.preco,

        p.emoji,

        (
          SELECT COUNT(*)
          FROM curtidas c
          WHERE c.atividade_id = p.id
        ) AS total_curtidas,

        (
          SELECT COUNT(*)
          FROM comentarios c
          WHERE c.atividade_id = p.id
        ) AS total_comentarios,

        (
          SELECT COUNT(*)
          FROM curtidas c2
          WHERE c2.atividade_id = p.id
          AND c2.usuario_id = ?
        ) AS curtida_usuario_logado

      FROM produto p

      ${whereSql}

      ORDER BY p.id DESC

      LIMIT ?
      OFFSET ?
      `,
      [
        currentUserId,
        ...params,
        limit,
        offset
      ]
    );

    const total = Number(totalRow.total);

    res.json({

      data: rows.map(formatProductRow),

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



app.get('/api/users/:userId/products', async (req, res) => {

  try {

    const userId = Number(req.params.userId);

    const rows = await all(
      `
      SELECT

        p.id,
        p.nome,
        p.categoria,
        p.quantidade,
        p.tempo_preparo,
        p.preco,
        p.emoji,

        (
          SELECT COUNT(*)
          FROM curtidas c
          WHERE c.atividade_id = p.id
        ) AS total_curtidas,

        (
          SELECT COUNT(*)
          FROM comentarios c
          WHERE c.atividade_id = p.id
        ) AS total_comentarios,

        0 AS curtida_usuario_logado

      FROM produto p

      WHERE p.usuario_id = ?

      ORDER BY p.id DESC
      `,
      [userId]
    );

    res.json({
      data: rows.map(formatProductRow)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao carregar os pedidos do usuário.'
    });

  }

});



app.post('/api/products', async (req, res) => {

  try {

    const {
      userId,
      type,
      name,
      quantity,
      time,
      price,
      emoji
    } = req.body;

 

    if (
      !userId ||
      !type ||
      !name ||
      quantity === undefined ||
      time === undefined ||
      price === undefined
    ) {

      return res.status(400).json({
        message: 'Campo obrigatório'
      });

    }



    const tiposPermitidos = [
      'café',
      'Lanches',
      'sobremesas'
    ];

    if (!tiposPermitidos.includes(type)) {

      return res.status(400).json({
        message: 'Tipo de produto inválido.'
      });

    }

    const parsedQuantity =
      Number(quantity);

    const parsedTime =
      Number(time);

    const parsedPrice =
      Number(price);

   

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {

      return res.status(400).json({
        message: 'Quantidade deve ser um número inteiro.'
      });

    }

    if (
      !Number.isFinite(parsedTime) ||
      parsedTime <= 0
    ) {

      return res.status(400).json({
        message: 'Tempo inválido.'
      });

    }

    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {

      return res.status(400).json({
        message: 'Preço inválido.'
      });

    }


    const result = await run(
      `
      INSERT INTO produto
      (
        usuario_id,
        nome,
        categoria,
        quantidade,
        tempo_preparo,
        preco,
        emoji
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)

      RETURNING id
      `,
      [
        userId,
        name,
        type,
        parsedQuantity,
        parsedTime,
        parsedPrice,
        emoji || '☕'
      ]
    );



    const created = await get(
      `
      SELECT

        p.id,
        p.nome,
        p.categoria,
        p.quantidade,
        p.tempo_preparo,
        p.preco,
        p.emoji,

        0 AS total_curtidas,
        0 AS total_comentarios,
        0 AS curtida_usuario_logado

      FROM produto p

      WHERE p.id = ?
      `,
      [result.rows[0].id]
    );

    res.status(201).json({

      product: formatProductRow(created)

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao criar pedido.'
    });

  }

});



app.post('/api/products/:id/like', async (req, res) => {

  try {

    const productId =
      Number(req.params.id);

    const { userId } = req.body;

    if (!userId) {

      return res.status(400).json({
        message: 'Usuário não autenticado.'
      });

    }



    const existing = await get(
      `
      SELECT usuario_id
      FROM curtidas
      WHERE usuario_id = ?
      AND atividade_id = ?
      `,
      [
        userId,
        productId
      ]
    );



    if (existing) {

      await run(
        `
        DELETE FROM curtidas

        WHERE usuario_id = ?
        AND atividade_id = ?
        `,
        [
          userId,
          productId
        ]
      );

    }



    else {

      await run(
        `
        INSERT INTO curtidas
        (
          usuario_id,
          atividade_id
        )

        VALUES (?, ?)
        `,
        [
          userId,
          productId
        ]
      );

    }

  

    const likes = await get(
      `
      SELECT COUNT(*) AS curtidas

      FROM curtidas

      WHERE atividade_id = ?
      `,
      [productId]
    );

    res.json({

      liked: !existing,

      likesCount:
        Number(likes.curtidas)

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao curtir produto.'
    });

  }

});


app.get('/api/products/:id/comments', async (req, res) => {

  try {

    const productId =
      Number(req.params.id);

    const comments = await all(
      `
      SELECT

        c.id,

        c.conteudo AS content,

        c.data_criacao AS created_at,

        u.nome AS user_name,

        u.url_foto AS user_photo

      FROM comentarios c

      JOIN usuarios u
        ON u.id = c.usuario_id

      WHERE c.atividade_id = ?

      ORDER BY c.data_criacao DESC
      `,
      [productId]
    );

    res.json({
      comments
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao listar comentários.'
    });

  }

});


app.post('/api/products/:id/comments', async (req, res) => {

  try {

    const productId =
      Number(req.params.id);

    const {
      userId,
      content
    } = req.body;

    if (!userId) {

      return res.status(400).json({
        message: 'Usuário não autenticado.'
      });

    }

    if (
      !content ||
      content.trim().length < 2
    ) {

      return res.status(400).json({
        message:
          'não é possível enviar um comentário vazio'
      });

    }

    await run(
      `
      INSERT INTO comentarios
      (
        usuario_id,
        atividade_id,
        conteudo,
        data_criacao
      )

      VALUES (?, ?, ?, ?)
      `,
      [
        userId,
        productId,
        content.trim(),
        new Date()
      ]
    );

    const count = await get(
      `
      SELECT COUNT(*) AS total

      FROM comentarios

      WHERE atividade_id = ?
      `,
      [productId]
    );

    res.status(201).json({

      commentsCount:
        Number(count.total)

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Erro ao comentar produto.'
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