# Deploy - Ótica Suellen

## EasyPanel

### 1. Criar serviço PostgreSQL
- No EasyPanel, crie um novo serviço PostgreSQL
- Anote a URL de conexão (formato: `postgresql://usuario:senha@hostname:5432/dbname`)

### 2. Criar serviço App
- Crie um serviço do tipo "App" apontando para o repositório Git
- Ou use a imagem Docker construída manualmente

### 3. Variáveis de ambiente obrigatórias
Configure estas variáveis no serviço App:

| Variável | Valor | Obrigatória |
|----------|-------|-------------|
| `DATABASE_URL` | URL do PostgreSQL do EasyPanel | SIM |
| `SESSION_SECRET` | String aleatória longa | SIM |
| `VITE_SUPABASE_URL` | `https://bwxkvmgtjilogxlzexah.supabase.co` | SIM |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase | SIM |
| `NODE_ENV` | `production` | SIM |
| `PORT` | `5000` (ou a porta do EasyPanel) | SIM |
| `WHATSAPP_ACCESS_TOKEN` | Token do WhatsApp Cloud API | Opcional |

**IMPORTANTE**: O `DATABASE_URL` deve apontar para o serviço PostgreSQL do EasyPanel, NÃO para localhost.

### 4. Build Args (para Dockerfile)
Se usando build via Dockerfile, configure os build args:
- `VITE_SUPABASE_URL` = URL do Supabase
- `VITE_SUPABASE_ANON_KEY` = Chave anon do Supabase

### 5. Porta
A aplicação escuta na porta definida em `PORT` (padrão: 5000).

### 6. Primeiro acesso
Na primeira execução, o sistema cria automaticamente:
- Todas as tabelas do banco de dados
- Dados de demonstração (clientes, produtos, etc.)
- Usuários padrão:
  - **Admin** (senha: 123456) - acesso total
  - **bruna@oticasuellenn.com** (senha: 123456) - atendente
  - **thamirys@oticasuellenn.com** (senha: 123456) - atendente

---

## Docker Compose (alternativa)

```bash
cp .env.example .env
# Edite o .env com suas credenciais
docker-compose up -d
```

A aplicação estará disponível em `http://localhost:5000`.
