# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project
Prompt chain tool using the "The Humor Project" class database

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · Supabase (auth + database)

**Auth flow:**
1. Unauthenticated users are redirected to `/auth/login` by middleware.
2. `/auth/login` triggers Supabase Google OAuth → redirects to `/auth/callback`.
3. `/auth/callback/route.ts` exchanges the code for a session and redirects to `/`.
4. Middleware checks the `profiles` table for `is_superadmin = true`; unauthorized users land on `/auth/unauthorized`. Any OAuth or exchange error redirects to `/auth/login?error=<message>`, which the login page displays.

**Supabase clients:**
- `src/lib/supabase/client.ts` — browser client (use in `"use client"` components)
- `src/lib/supabase/server.ts` — server client (use in Server Components and Route Handlers)

**Access control** is enforced in `src/middleware.ts`, which runs on every non-static route. Access requires a row in `profiles` with `id` matching `auth.users.id` and `is_superadmin = true`.

**`profiles` table key columns (read-only — do not modify schema):**
`id` (uuid) · `is_superadmin` (bool) · `is_in_study` (bool) · `is_matrix_admin` (bool) · `first_name` · `last_name` · `email`

**Environment variables** (in `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=      # e.g. http://localhost:3000 — used as OAuth redirect base
GOOGLE_OAUTH_CLIENT_ID=    # configured in Supabase dashboard; not referenced in app code
```

## Supabase MCP Safety Rules

Claude may use the Supabase MCP to inspect the database schema and read data.

Allowed actions:

- Read table schemas
- View table columns
- Run SELECT queries
- Inspect relationships
- Inspect indexes
- Inspect policies (read-only)

Claude should treat the database as **read-only**.

If a task requires modifying the database, Claude must:
1. Explain the change needed
2. Ask the user for approval
3. Wait for confirmation before proceeding.

Never make destructive changes automatically.

## Accent Color Palette
- Black #040303
- Dark Slate Grey #3A4E48
- Grey #6A7B76
- Muted Teal #8B9D83
- Silver #BEB0A7
