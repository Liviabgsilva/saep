const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');



const USERS_CSV = path.join(
  __dirname,
  'data',
  'usuarios.csv'
);

const PRODUCTS_CSV = path.join(
  __dirname,
  'data',
  'produtos.csv'
);

const ORDERS_CSV = path.join(
  __dirname,
  'data',
  'pedidos.csv'
);

const REVIEWS_CSV = path.join(
  __dirname,
  'data',
  'avaliacoes.csv'
);




const DB_HOST =
  process.env.DB_HOST || '127.0.0.1';

const DB_PORT =
  Number(process.env.DB_PORT || 5432);

const DB_USER =
  process.env.DB_USER || 'postgres';

const DB_PASSWORD =
  process.env.DB_PASSWORD || 'senai';

const DB_NAME =
  process.env.DB_NAME || 'CoffeeHouse';

const DB_ADMIN_DATABASE =
  process.env.DB_ADMIN_DATABASE || 'postgres';

let pool;




function parseCsv(filePath) {

  if (!fs.existsSync(filePath)) {

    console.warn(
      `Arquivo CSV não encontrado: ${filePath}`
    );

    return [];
  }

  const raw =
    fs.readFileSync(
      filePath,
      'utf8'
    ).trim();

  if (!raw) {
    return [];
  }

  const [
    header,
    ...lines
  ] = raw.split(/\r?\n/);

  const keys =
    header
      .split(',')
      .map(
        (key) => key.trim()
      );

  return lines
    .filter(
      (line) => line.trim()
    )
    .map((line) => {

      const values =
        line.split(',');

      return keys.reduce(
        (acc, key, index) => {

          acc[key] =
            (
              values[index] || ''
            ).trim();

          return acc;

        },
        {}
      );

    });
}


function toPgQuery(sql) {

  let index = 0;

  return sql.replace(
    /\?/g,
    () => {

      index++;

      return `$${index}`;

    }
  );
}




async function run(
  sql,
  params = []
) {

  const result =
    await pool.query(
      toPgQuery(sql),
      params
    );

  return result;
}




async function all(
  sql,
  params = []
) {

  const result =
    await pool.query(
      toPgQuery(sql),
      params
    );

  return result.rows;
}


async function get(
  sql,
  params = []
) {

  const result =
    await pool.query(
      toPgQuery(sql),
      params
    );

  return result.rows[0];
}


async function ensureDatabaseExists() {

  const adminPool =
    new Pool({

      host: DB_HOST,

      port: DB_PORT,

      user: DB_USER,

      password: DB_PASSWORD,

      database: DB_ADMIN_DATABASE

    });

  try {

    const { rows } =
      await adminPool.query(
        `
        SELECT 1
        FROM pg_database
        WHERE datname = $1
        `,
        [DB_NAME]
      );

    if (rows.length === 0) {

      await adminPool.query(
        `CREATE DATABASE "${DB_NAME}"`
      );

      console.log(
        `Banco ${DB_NAME} criado com sucesso.`
      );

    }

  } finally {

    await adminPool.end();

  }
}




async function initDb() {



  await ensureDatabaseExists();



  pool =
    new Pool({

      host: DB_HOST,

      port: DB_PORT,

      user: DB_USER,

      password: DB_PASSWORD,

      database: DB_NAME,

      max: 10

    });




  await run(`
    CREATE TABLE IF NOT EXISTS empresa (

      id INT PRIMARY KEY,

      nome VARCHAR(120) NOT NULL,

      url_logo VARCHAR(255)

    )
  `);




  await run(`
    CREATE TABLE IF NOT EXISTS usuarios (

      id INT PRIMARY KEY,

      nome VARCHAR(120) NOT NULL,

      senha VARCHAR(120) NOT NULL

    )
  `);


 

  await run(`
    CREATE TABLE IF NOT EXISTS produto (

      id INT PRIMARY KEY,

      nome VARCHAR(150) NOT NULL,

      categoria VARCHAR(30) NOT NULL,

      preco DECIMAL(10, 2) NOT NULL,

      tempo_preparo INT NOT NULL,

      emoji VARCHAR(20) NOT NULL,

      CONSTRAINT chk_produto_categoria

      CHECK (
        categoria IN (
          'cafe',
          'café',
          'lanches',
          'Lanches',
          'sobremesas'
        )
      ),

      CONSTRAINT chk_produto_preco

      CHECK (
        preco >= 0
      ),

      CONSTRAINT chk_produto_tempo

      CHECK (
        tempo_preparo > 0
      )

    )
  `);



  await run(`
    CREATE TABLE IF NOT EXISTS pedidos (

      id INT PRIMARY KEY,

      produto_id INT NOT NULL,

      quantidade INT NOT NULL,

      data_pedido TIMESTAMP NOT NULL,

      CONSTRAINT chk_pedido_quantidade

      CHECK (
        quantidade > 0
      ),

      CONSTRAINT fk_pedido_produto

      FOREIGN KEY (produto_id)

      REFERENCES produto(id)

      ON DELETE CASCADE

    )
  `);


  

  await run(`
    CREATE TABLE IF NOT EXISTS avaliacoes (

      id INT PRIMARY KEY,

      produto_id INT NOT NULL,

      nota INT NOT NULL,

      comentario TEXT NOT NULL,

      data_avaliacao TIMESTAMP NOT NULL,

      CONSTRAINT chk_avaliacao_nota

      CHECK (
        nota BETWEEN 1 AND 5
      ),

      CONSTRAINT fk_avaliacao_produto

      FOREIGN KEY (produto_id)

      REFERENCES produto(id)

      ON DELETE CASCADE

    )
  `);



  const empresa =
    await get(`
      SELECT id
      FROM empresa
      LIMIT 1
    `);

  if (!empresa) {

    await run(
      `
      INSERT INTO empresa
      (
        id,
        nome,
        url_logo
      )

      VALUES (?, ?, ?)
      `,
      [
        1,
        'CoffeeHouse',
        '/img/CoffeeHouse.png'
      ]
    );

    console.log(
      'Empresa CoffeeHouse cadastrada.'
    );

  }



  const usuariosCount =
    await get(`
      SELECT COUNT(*) AS quantidade
      FROM usuarios
    `);

  if (
    Number(
      usuariosCount.quantidade
    ) === 0
  ) {

    const usuarios =
      parseCsv(USERS_CSV);

    for (
      const usuario
      of usuarios
    ) {

      if (
        !usuario.id ||
        !usuario.nome
      ) {

        continue;

      }

      await run(
        `
        INSERT INTO usuarios
        (
          id,
          nome,
          senha
        )

        VALUES (?, ?, ?)

        ON CONFLICT (id)
        DO NOTHING
        `,
        [
          Number(usuario.id),

          usuario.nome,

          usuario.senha || '123456'
        ]
      );

    }

    console.log(
      'Usuários importados.'
    );

  }





  const produtosCount =
    await get(`
      SELECT COUNT(*) AS quantidade
      FROM produto
    `);

  if (
    Number(
      produtosCount.quantidade
    ) === 0
  ) {

    const produtos =
      parseCsv(PRODUCTS_CSV);

    for (
      const produto
      of produtos
    ) {

      if (
        !produto.id ||
        !produto.nome
      ) {

        continue;

      }

      const categoria =
        produto.categoria ||
        'cafe';

      const preco =
        Number(
          produto.preco || 0
        );

      const tempo =
        Number(
          produto.tempo_preparo || 1
        );

      const emoji =
        produto.emoji || '☕';

      await run(
        `
        INSERT INTO produto
        (
          id,
          nome,
          categoria,
          preco,
          tempo_preparo,
          emoji
        )

        VALUES (?, ?, ?, ?, ?, ?)

        ON CONFLICT (id)
        DO NOTHING
        `,
        [
          Number(produto.id),

          produto.nome,

          categoria,

          preco,

          tempo,

          emoji
        ]
      );

    }

    console.log(
      'Produtos importados.'
    );

  }



  const pedidosCount =
    await get(`
      SELECT COUNT(*) AS quantidade
      FROM pedidos
    `);

  if (
    Number(
      pedidosCount.quantidade
    ) === 0
  ) {

    const pedidos =
      parseCsv(ORDERS_CSV);

    for (
      const pedido
      of pedidos
    ) {

      if (
        !pedido.id ||
        !pedido.produto_id
      ) {

        continue;

      }

      const produtoExiste =
        await get(
          `
          SELECT id
          FROM produto
          WHERE id = ?
          `,
          [
            Number(
              pedido.produto_id
            )
          ]
        );

      if (!produtoExiste) {

        console.warn(
          `Produto ${pedido.produto_id} não encontrado para o pedido ${pedido.id}.`
        );

        continue;

      }

      await run(
        `
        INSERT INTO pedidos
        (
          id,
          produto_id,
          quantidade,
          data_pedido
        )

        VALUES (?, ?, ?, ?)

        ON CONFLICT (id)
        DO NOTHING
        `,
        [
          Number(pedido.id),

          Number(
            pedido.produto_id
          ),

          Number(
            pedido.quantidade || 1
          ),

          new Date(
            pedido.data_pedido
          )
        ]
      );

    }

    console.log(
      'Pedidos importados.'
    );

  }


 

  const avaliacoesCount =
    await get(`
      SELECT COUNT(*) AS quantidade
      FROM avaliacoes
    `);

  if (
    Number(
      avaliacoesCount.quantidade
    ) === 0
  ) {

    const avaliacoes =
      parseCsv(REVIEWS_CSV);

    for (
      const avaliacao
      of avaliacoes
    ) {

      if (
        !avaliacao.id ||
        !avaliacao.produto_id
      ) {

        continue;

      }

      const produtoExiste =
        await get(
          `
          SELECT id
          FROM produto
          WHERE id = ?
          `,
          [
            Number(
              avaliacao.produto_id
            )
          ]
        );

      if (!produtoExiste) {

        console.warn(
          `Produto ${avaliacao.produto_id} não encontrado para a avaliação ${avaliacao.id}.`
        );

        continue;

      }

      await run(
        `
        INSERT INTO avaliacoes
        (
          id,
          produto_id,
          nota,
          comentario,
          data_avaliacao
        )

        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT (id)
        DO NOTHING
        `,
        [
          Number(
            avaliacao.id
          ),

          Number(
            avaliacao.produto_id
          ),

          Number(
            avaliacao.nota
          ),

          avaliacao.comentario || '',

          new Date(
            avaliacao.data_avaliacao
          )
        ]
      );

    }

    console.log(
      'Avaliações importadas.'
    );

  }




  console.log(
    'Banco CoffeeHouse inicializado com sucesso.'
  );

}




module.exports = {

  run,

  get,

  all,

  initDb

};