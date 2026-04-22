# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is the **Marketing Naming Platform** — a multi-tenant web app for marketing teams to define naming dimensions, output formats, and generate consistent naming conventions.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **State**: TanStack Query (React Query)
- **Routing**: Wouter
- **Auth**: JWT (bcryptjs passwords, jsonwebtoken)

## Artifacts

- **Marketing Naming Platform** (`artifacts/marketing-naming-platform`) — React frontend, served at `/`
- **API Server** (`artifacts/api-server`) — Express API backend, port 8080

## Key Packages

- `lib/db` — Drizzle ORM schema (teams, users, dimensions, dimension-values, outputs)
- `lib/api-spec` — OpenAPI 3.0 spec + orval codegen config
- `lib/api-zod` — Generated Zod validation schemas
- `lib/api-client-react` — Generated TanStack Query hooks + customFetch with JWT bearer injection

## Auth Flow

- JWT stored in localStorage as `auth_token`
- `setAuthTokenGetter` registered in `AuthProvider` so all API calls auto-attach `Authorization: Bearer <token>`
- Protected routes redirect to `/login` when unauthenticated

## API Routes (all under `/api/`)

- `POST /auth/register` — create team + user, returns JWT
- `POST /auth/login` — returns JWT
- `GET /auth/me` — current user info
- `GET/POST /dimensions` — list/create naming dimensions
- `PUT/DELETE /dimensions/:id` — update/delete dimension
- `POST /dimensions/:id/duplicate` — duplicate with values
- `GET/POST /dimensions/:id/values` — list/add values
- `PUT/DELETE /dimensions/:id/values/:valueId` — update/delete value
- `GET/POST /outputs` — list/create output format templates
- `PUT/DELETE /outputs/:id` — update/delete output
- `POST /generate` — generate names by substituting dimension value short codes into output format tokens
- `GET /config/export` — export full config as JSON
- `POST /config/import` — import config from JSON
- `GET /dashboard/stats` — workspace stats

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
