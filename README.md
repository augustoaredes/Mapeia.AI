# Mapeia.AI

Plataforma SaaS para transformar fotos de drone em mapas ortomosaicos.

> "Envie suas fotos → receba seu mapa pronto"

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | PostgreSQL |
| Fila | Redis + BullMQ |
| Processamento | OpenDroneMap (Docker) |
| Deploy frontend | Vercel |
| Deploy backend | Railway / Render |

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- npm

### 1. Clone o repositório

```bash
git clone <url-do-repo>
cd Mapeia.AI
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com seus valores
```

### 3. Suba o banco e o Redis

```bash
docker compose up -d
```

### 4. Rode o frontend

```bash
cd apps/web
npm install
npm run dev
```

Acesse: http://localhost:3000

### 5. Rode o backend (em outro terminal)

```bash
cd apps/api
npm install
npm run dev
```

API disponível em: http://localhost:3001

---

## Estrutura do Projeto

```
Mapeia.AI/
├── apps/
│   ├── web/              ← Next.js (frontend + landing page)
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── upload/page.tsx   # Upload de fotos
│   │   │   ├── dashboard/        # Lista de projetos
│   │   │   ├── project/[id]/     # Visualização do mapa
│   │   │   ├── terms/page.tsx    # Termos de Uso
│   │   │   └── privacy/page.tsx  # Política de Privacidade
│   │   └── ...
│   └── api/              ← Node.js (API REST)
│       ├── src/
│       │   ├── routes/           # Endpoints
│       │   ├── workers/          # Jobs BullMQ
│       │   ├── services/         # Lógica de negócio
│       │   └── processing/       # runODM()
│       └── ...
├── docker-compose.yml    ← PostgreSQL + Redis
├── .env.example          ← Variáveis documentadas
└── README.md
```

---

## Páginas

| Rota | Descrição |
|---|---|
| `/` | Landing page |
| `/upload` | Upload de fotos de drone |
| `/dashboard` | Lista de projetos do usuário |
| `/project/[id]` | Visualização e download do mapa |
| `/terms` | Termos de Uso |
| `/privacy` | Política de Privacidade (LGPD) |

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/projects` | Criar novo projeto |
| POST | `/upload` | Enviar imagens para um projeto |
| GET | `/projects` | Listar projetos do usuário |
| GET | `/projects/:id` | Detalhes e status do projeto |
| GET | `/projects/:id/download` | Download do resultado (.zip) |

---

## Créditos

Esta plataforma utiliza o [OpenDroneMap](https://opendronemap.org) para processamento fotogramétrico.
O ODM é um projeto de código aberto distribuído sob a licença GPL-3.0.

O Mapeia.AI não é afiliado, patrocinado ou endossado pelo projeto OpenDroneMap.

---

## Licença

Proprietária — todos os direitos reservados ao Mapeia.AI.
