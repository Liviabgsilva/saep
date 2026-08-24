# ☕ CoffeeHouse - Sistema de Gestão de Cafeteria (SAEP)

Um sistema web completo para visualização, autenticação e gerenciamento de cardápio e dados da cafeterias **CoffeeHouse**, desenvolvido como parte do projeto/avaliação SAEP. O sistema conta com um backend em **Node.js / Express**, banco de dados relacional **PostgreSQL** com população automática a partir de arquivos CSV, e uma interface Web interativa (HTML5, CSS3, JS).

---

## 📋 Sumário

- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Funcionalidades](#-funcionalidades)
- [Modelagem do Banco de Dados](#-modelagem-do-banco-de-dados)
- [Endpoints da API](#-endpoints-da-api)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Executar o Projeto](#-como-executar-o-projeto)

---

## 🛠️ Tecnologias Utilizadas

### **Backend**
- **Node.js** (v18+)
- **Express.js** (v5.2.1) - Framework para rotas e serviços HTTP
- **PostgreSQL / `pg`** (v8.23.0) - Banco de dados relacional e driver de conexão
- **CORS** - Permissão de requisições cross-origin

### **Frontend**
- **HTML5 & CSS3** - Estruturação e estilização da interface
- **JavaScript (Vanilla)** (`app.js`) - Consumo da API e dinamismo da aplicação
- **SVG Vector Graphics** - Ícones das redes sociais e logo oficial

### **Dados Inicializadores**
- Arquivos `.csv` em `data/` para carga inicial automatizada do banco de dados.

---

## 📁 Estrutura do Projeto

```text
.
├── .vscode/
│   └── settings.json        # Configurações do ambiente de desenvolvimento no VS Code
├── data/
│   ├── avaliacoes.csv       # Carga inicial de avaliações dos clientes
│   ├── pedidos.csv          # Carga inicial do histórico de pedidos
│   ├── produtos.csv         # Carga inicial do catálogo de produtos
│   └── usuarios.csv         # Carga inicial de usuários do sistema
├── public/                  # Arquivos estáticos servidos pelo Express
│   ├── anexos/              # Recursos de imagem/ícones
│   │   ├── intagram.svg
│   │   ├── logo.svg
│   │   ├── tiktok.svg
│   │   └── twitter_138401.svg
│   ├── app.js               # Lógica de frontend e consumo da API
│   ├── index.html           # Página principal da aplicação
│   └── style.css            # Estilos visuais da aplicação
├── db.js                    # Inicialização, criação de tabelas e carga CSV no PostgreSQL
├── package.json             # Dependências e scripts da aplicação
├── package-lock.json        # Mapeamento exato de versões de dependências
└── server.js                # Servidor principal Express e rotas da API
```

---

## ✨ Funcionalidades

1. **Auto-inicialização de Banco de Dados:**
   - Verifica e cria automaticamente o banco de dados `CoffeeHouse` se este não existir.
   - Cria as tabelas do sistema (`empresa`, `usuarios`, `produto`, `pedidos`, `avaliacoes`) com restrições e validações SQL.
   - Lê os arquivos CSV da pasta `data/` e popula o banco de dados na primeira execução.

2. **Autenticação de Usuários:**
   - Login seguro de usuários contra a base de dados (`/api/login`).

3. **Catálogo & Cardápio de Produtos:**
   - Consulta de produtos disponíveis por categoria (`cafe`, `lanches`, `sobremesas`).
   - Informações detalhadas por produto: preço, tempo de preparo e emoji representativo.

4. **Identidade Visual da Empresa:**
   - Endpoint dedicado para recuperar informações institucionais (nome e logo).

---

## 🗄️ Modelagem do Banco de Dados

### **Tabelas Principais:**

* **`empresa`**:
  - `id` (INT, Primary Key)
  - `nome` (VARCHAR 120)
  - `url_logo` (VARCHAR 255)

* **`usuarios`**:
  - `id` (INT, Primary Key)
  - `nome` (VARCHAR 120)
  - `senha` (VARCHAR 120)

* **`produto`**:
  - `id` (INT, Primary Key)
  - `nome` (VARCHAR 150)
  - `categoria` (VARCHAR 30) — *Validação CHECK: `'cafe'`, `'lanches'`, `'sobremesas'`*
  - `preco` (DECIMAL 10,2) — *Validação CHECK: `preco >= 0`*
  - `tempo_preparo` (INT) — *Validação CHECK: `tempo_preparo > 0`*
  - `emoji` (VARCHAR 20)

* **`pedidos`**:
  - `id` (INT, Primary Key)
  - `produto_id` (INT, FK -> `produto.id` ON DELETE CASCADE)
  - `quantidade` (INT) — *Validação CHECK: `quantidade > 0`*
  - `data_pedido` (TIMESTAMP)

* **`avaliacoes`**:
  - `id` (INT, Primary Key)
  - `produto_id` (INT, FK -> `produto.id` ON DELETE CASCADE)
  - `nota` (INT) — *Validação CHECK: `nota BETWEEN 1 AND 5`*
  - `comentario` (TEXT)
  - `data_avaliacao` (TIMESTAMP)

---

## 🔌 Endpoints da API

| Método | Rota | Descrição | Parâmetros / Body |
|---|---|---|---|
| `GET` | `/api/company` | Retorna os dados cadastrais da empresa (Nome e Logo). | N/A |
| `POST` | `/api/login` | Realiza a autenticação do usuário. | `{ "nome": "...", "senha": "..." }` |
| `GET` | `/api/products` | Lista os produtos do cardápio. Aceita filtro por categoria. | `?type=cafe` ou `?categoria=lanches` |
| `GET` | `*` | Retorna o frontend SPA (`index.html`). | N/A |

---

## ⚙️ Variáveis de Ambiente

As configurações do banco de dados PostgreSQL podem ser definidas via variáveis de ambiente. Caso não sejam informadas, o sistema utilizará os valores padrão abaixo:

| Variável | Valor Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta em que o servidor web será executado |
| `DB_HOST` | `127.0.0.1` | Endereço do servidor PostgreSQL |
| `DB_PORT` | `5432` | Porta de conexão com o PostgreSQL |
| `DB_USER` | `postgres` | Usuário do banco de dados |
| `DB_PASSWORD` | `senai` | Senha do usuário |
| `DB_NAME` | `CoffeeHouse` | Nome do banco de dados principal |
| `DB_ADMIN_DATABASE` | `postgres` | Banco administrativo para criação do `CoffeeHouse` |

---

## 🚀 Como Executar o Projeto

### **Pré-requisitos:**
- [Node.js](https://nodejs.org/) (Versão 18 ou superior)
- [PostgreSQL](https://www.postgresql.org/) instalado e em execução no seu computador.

### **Passo a Passo:**

1. **Clonar ou Baixar o Repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd saep
   ```

2. **Instalar as Dependências:**
   ```bash
   npm install
   ```

3. **Configurar o Banco de Dados:**
   Certifique-se de que o PostgreSQL está rodando com o usuário `postgres` e senha `senai` (ou configure as variáveis de ambiente conforme necessário).

4. **Iniciando a Aplicação:**
   ```bash
   node server.js
   ```

5. **Acessar a Aplicação:**
   Abra o navegador e acesse:
   `http://localhost:3000`

---

## 📝 Licença

Projeto desenvolvido para fins didáticos e avaliativos (SAEP).