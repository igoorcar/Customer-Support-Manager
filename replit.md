# Ótica Suellen - Painel de Atendimento

## Overview
WhatsApp customer service management panel for an optical shop called "Ótica Suellen". Built with React + TypeScript frontend, Express backend, and PostgreSQL database.

## Recent Changes
- 2026-02-12: Initial MVP implementation with all core pages and features

## Architecture

### Frontend (client/src/)
- **Framework**: React with TypeScript, Vite bundler
- **Routing**: Wouter
- **Styling**: Tailwind CSS + Shadcn UI components
- **State/Data**: TanStack React Query
- **Charts**: Recharts
- **Icons**: Lucide React

### Pages
- `/` - Dashboard with metrics, chart, conversations table, activity feed
- `/conversas` - Conversations list with search and status filters
- `/clientes` - Client management (CRUD)
- `/respostas` - Quick replies management (CRUD)
- `/produtos` - Product catalog (CRUD)
- `/relatorios` - Reports with charts and analytics
- `/configuracoes` - Business settings

### Backend (server/)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: DatabaseStorage class implementing IStorage interface

### Data Model (shared/schema.ts)
- users, attendants, clients, conversations, messages, quickReplies, products, activities

### API Routes (all prefixed with /api)
- GET /api/stats - Dashboard metrics
- GET /api/stats/chart - Hourly conversation chart data
- GET/POST /api/conversations - Conversation management
- GET/POST /api/clients - Client management
- GET/POST/DELETE /api/quick-replies - Quick reply management
- GET/POST /api/products - Product management
- GET /api/activities - Recent activity feed
- GET /api/reports - Reports data

## User Preferences
- Language: Portuguese (Brazilian)
- Theme: Blue primary (#2563EB), professional optical shop branding
- Font: Inter / system-ui
