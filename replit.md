# Ótica Suellen - Painel de Atendimento

## Overview
WhatsApp customer service management panel for an optical shop called "Ótica Suellen". Built with React + TypeScript frontend, Express backend, and PostgreSQL database. Features authentication, product catalog, client management, conversation handling, analytics, and settings.

## Recent Changes
- 2026-02-15: Follow-up 72h Analytics system - full page with 8 sections (Overview metrics, Conversion funnel, Message performance chart+table, Send time heatmap, Funnel label performance, Loss reasons pie, Lead journeys, A/B tests management)
- 2026-02-15: SQL migration script (sql/followup-analytics-migration.sql) for Supabase tables: followup_logs, followup_metricas_diarias, followup_ab_tests + views + RPC functions
- 2026-02-15: Webhook POST /api/webhook/marcar-resposta-followup (marks follow-up responses with timing, type, conversion data)
- 2026-02-15: Follow-up API methods in api.ts (getFollowupOverview, getFollowupFunil, getFollowupPerformanceMensagem, getFollowupMelhorHorario, getFollowupPerformanceFunil, getFollowupMotivosPerda, getFollowupJornadas, getFollowupAbTests, createFollowupAbTest, updateFollowupAbTest)
- 2026-02-15: New route /followup with sidebar navigation item "Follow-up 72h"
- 2026-02-13: Comprehensive Dashboard with period selector (hoje/7dias/30dias/mês), 9 metric cards, timeline chart, attendant performance bar, funnel pie, product pie, hourly area chart, attendant table
- 2026-02-13: Enhanced Relatórios with 5 tabs (Visão Geral, Conversas, Atendentes, Vendas, Clientes), date/atendente/status/etiqueta filters, CSV export
- 2026-02-13: getDashboardCompleto API method (single call fetches all dashboard data with period filtering)
- 2026-02-13: getRelatorioConversas API method (filtered conversation reports with message counts)
- 2026-02-13: CSV export utility (exportToCSV function with BOM for Excel compatibility)
- 2026-02-13: Collapsible etiqueta filter (sanfona) in conversations page - shows active filter badge when collapsed
- 2026-02-13: Client tags included in getConversas query for etiqueta filtering
- 2026-02-13: Sticky conversations mechanism (prevents conversations from disappearing when n8n temporarily changes atendente_id, uses missCount with 3-fetch grace period)
- 2026-02-13: Delayed atendente_id re-confirmation (2s setTimeout after enviarMensagem to re-set atendente_id in case n8n overrides it)
- 2026-02-13: Webhook /api/webhook/salvar-mensagem-recebida (saves incoming client messages preserving atendente_id)
- 2026-02-13: Enhanced /api/webhook/salvar-mensagem-ia (now reads and re-applies existing atendente_id to prevent assignment loss)
- 2026-02-13: AtendenteStatus component (attendant presence tracking with online/offline heartbeat, status toggle, Supabase real-time)
- 2026-02-13: useConversasPorAtendente hook (filter conversations by attendant with real-time updates)
- 2026-02-13: EtiquetasManager component (conversation tags from Supabase etiquetas/conversas_etiquetas tables, real-time sync, funil/produto/status categories)
- 2026-02-13: Lunch break (almoço) support in horarioComercial.ts and IAToggle mode display
- 2026-02-13: Server-side Supabase Storage uploads with ffmpeg timeout guard and expired media placeholders
- 2026-02-13: IA Atendente toggle per conversation (useIAControl hook, IAToggle component, business hours utility, realtime Supabase subscription)
- 2026-02-13: Audio OGG conversion via FFmpeg (/api/upload/audio endpoint converts any audio to OGG Opus for WhatsApp)
- 2026-02-13: Optimistic messages persist across refetches (ref-based storage, deduplication when real data arrives)
- 2026-02-13: Media uploads to Supabase Storage bucket "midias" with local fallback
- 2026-02-13: WhatsApp-style MessageInput component (attachment menu, emoji picker, file preview, drag&drop, audio recording)
- 2026-02-13: Migrated Dashboard, Clientes, Relatórios to use real Supabase data (all metrics, charts, conversations, clients from Supabase)
- 2026-02-13: Fixed session authentication for published app (trust proxy, secure:auto, 7-day sessions)
- 2026-02-12: Local file upload system (multer, /api/upload endpoint) replacing Supabase Storage
- 2026-02-12: Response Buttons with media upload feature
- 2026-02-12: Enhanced Products page with 53 products, grid/list views, filters, detail/edit modals
- 2026-02-12: Multi-tab Reports page (5 tabs: Visão Geral, Atendimento, Vendas, Atendentes, Clientes)
- 2026-02-12: Authentication system (passport.js + express-session, login/register, protected routes)
- 2026-02-12: Initial MVP implementation

## Architecture

### Frontend (client/src/)
- **Framework**: React with TypeScript, Vite bundler
- **Routing**: Wouter
- **Styling**: Tailwind CSS + Shadcn UI components
- **State/Data**: TanStack React Query
- **Charts**: Recharts
- **Icons**: Lucide React
- **Auth**: AuthProvider context with useAuth hook

### Pages
- `/` - Dashboard with metrics, chart, conversations table, activity feed
- `/conversas` - 3-panel WhatsApp-style conversations (list, chat, client info)
- `/clientes` - Client management with grid/list views, profile modals, filters
- `/respostas` - Quick replies management with categories and usage tracking
- `/produtos` - Enhanced product catalog with 53 products, grid/list views, stats cards, filters, detail/edit modals
- `/relatorios` - Multi-tab reports (Visão Geral, Atendimento, Vendas, Atendentes, Clientes)
- `/configuracoes` - Multi-section settings (Perfil, Conta, Notificações, Atendimento, Horário, Equipe, Aparência, Segurança)
- Login/Register page with branded split-screen layout

### Backend (server/)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM (local: users, products, quick-replies, settings)
- **Supabase**: External data source for WhatsApp data (conversas, mensagens, clientes, atendentes, botoes)
- **Auth**: Passport.js with LocalStrategy, express-session, connect-pg-simple
- **Storage**: DatabaseStorage class implementing IStorage interface
- **File Upload**: multer for local file storage (/uploads directory)

### Data Source Architecture
- **Supabase (frontend-direct)**: Dashboard metrics, conversations, clients, attendants, reports, response buttons - queried directly from frontend via Supabase JS client (client/src/services/api.ts)
- **Local PostgreSQL (backend API)**: Products, quick-replies, user auth, settings - served via Express /api/* routes
- Supabase tables: conversas, mensagens, clientes, atendentes, botoes_resposta, botoes_midias
- n8n webhooks: message sending, button creation, conversation transfer

### Authentication (server/auth.ts)
- Passport.js LocalStrategy with scrypt password hashing
- Express-session with PostgreSQL session store (connect-pg-simple)
- All /api/* routes (except /api/auth/*) protected by requireAuth middleware
- Cookie-based sessions with 24h expiry

### Data Model (shared/schema.ts)
- users, attendants, clients, conversations, messages, quickReplies, products, activities, clientNotes
- Products schema: id, name, description, sku, brand, price, promoPrice, costPrice, category, stock, stockAlert, soldCount, image, format, material, color, gender, active, createdAt

### API Routes (all prefixed with /api)
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- GET /api/auth/me - Current user
- GET /api/stats - Dashboard metrics
- GET /api/stats/chart - Hourly conversation chart data
- GET/POST/PATCH /api/conversations - Conversation management
- GET/POST/PATCH/DELETE /api/clients - Client management (paginated with filters)
- GET/POST/PATCH/DELETE /api/quick-replies - Quick reply management
- GET/POST/PATCH/DELETE /api/products - Product management
- GET /api/activities - Recent activity feed
- GET /api/reports - Reports data
- GET /api/attendants - Attendants list
- POST /api/webhook/salvar-mensagem-ia - Webhook for n8n to save AI-sent messages (no auth required, saves to Supabase mensagens with enviada_por=null, metadata={"remetente":"ia"}). Accepts: conversa_id (required), conteudo, tipo, midia_url, midia_mime_type, whatsapp_message_id

## User Preferences
- Language: Portuguese (Brazilian)
- Theme: Blue primary (#2563EB), professional optical shop branding
- Font: Inter / system-ui
