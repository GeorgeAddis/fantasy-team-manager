# Fantasy Team Manager

Local-first stack: **Laravel 11 API** + **PostgreSQL** in Docker, **React (Vite)** on the host via npm.

| Part        | How you run it |
|------------|----------------|
| Postgres   | Docker (`docker compose up`) |
| Laravel API | Docker (`docker compose up`) → http://localhost:8000 |
| React app  | `cd frontend && npm run dev` → http://localhost:3000 |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS)
- Node.js + npm (for the frontend only)

### Windows: `docker` not recognized (Cursor / PowerShell)

Restarting the terminal often **still** fails because **Docker isn’t on your user PATH**. Do one of the following.

#### A) Fix PATH permanently (recommended)

1. Press **Win**, type **environment variables**, open **Edit environment variables for your account** (or *system* if you prefer).
2. Under **User variables** (or **System**), select **Path** → **Edit** → **New**.
3. Add exactly:
   ```text
   C:\Program Files\Docker\Docker\resources\bin
   ```
4. **OK** out of all dialogs.
5. **Fully quit Cursor** (File → Exit), then open Cursor again — new terminals inherit PATH.

#### B) One-liner each session

```powershell
$env:PATH = "C:\Program Files\Docker\Docker\resources\bin;" + $env:PATH
docker compose up
```

#### C) No PATH needed — `dc.cmd` (works in Cursor)

From the project folder (CMD or PowerShell):

```powershell
.\dc.cmd up
.\dc.cmd up -d
.\dc.cmd --profile init run --rm composer-init
```

This calls `docker.exe` by full path.

#### D) Use the project scripts (no global PATH change)

From the repo root in PowerShell:

```powershell
.\scripts\composer-init.ps1    # first time only (if backend missing)
.\scripts\compose-up.ps1       # same as docker compose up
.\scripts\compose-up.ps1 -d    # detached
```

Scripts load Docker’s folder for that run only. If PowerShell blocks scripts, run once:  
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## First-time setup

### 1. Create the Laravel app (once)

From the project root:

```bash
docker compose --profile init run --rm composer-init
```

On Windows if `docker` isn’t found, run `.\scripts\composer-init.ps1` instead.

This creates `./backend` with a fresh Laravel install (same as `composer create-project`).  
If `backend/artisan` already exists, it does nothing.

### 2. Point Laravel at Postgres (recommended for local + Docker)

After step 1, merge DB settings into `backend/.env` (Laravel’s default is often SQLite).  
You can copy from `.env.postgres.example` or set:

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=fantasy_team_manager
DB_USERNAME=fantasy
DB_PASSWORD=fantasy_secret
```

**Note:** When the API runs **inside Docker**, `DB_HOST=postgres` is correct.  
If you ever run `php artisan` **on your machine** against the same DB, use `DB_HOST=127.0.0.1` and ensure port `5432` is published (as in this compose file).

### 3. Start Postgres + API

```bash
docker compose build backend
docker compose up -d
```

- API: http://localhost:8000  
- Postgres: `localhost:5432` (user `fantasy`, password `fantasy_secret`, DB `fantasy_team_manager`)

Migrations run on container start when possible. To run manually:

```bash
docker compose exec backend php artisan migrate
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the UI calls the API through Vite’s proxy (`/api/*` → Laravel) so you don’t hit CORS during dev.

---

## Daily dev

```bash
# Terminal 1
docker compose up

# Terminal 2
cd frontend && npm run dev
```

---

## Future deployment (optional)

- **Backend:** Build the same PHP image (or use Octane/nginx-fpm), set `APP_ENV=production`, `APP_DEBUG=false`, strong `APP_KEY`, and Postgres credentials via secrets/env — no need to change the app structure.
- **Frontend:** `npm run build` → static assets on any CDN or static host; set `VITE_API_URL` to your public API URL and call it from the app (configure CORS on Laravel for that origin).
- **DB:** Managed Postgres (RDS, Supabase, etc.) — same `pgsql` config, different host/credentials.

---

## Project layout

```
fantasy-football/
├── docker-compose.yml    # postgres + laravel
├── docker/php/Dockerfile
├── .env.postgres.example # DB snippet for backend/.env
├── backend/              # Laravel (created by composer-init)
└── frontend/             # React + Vite (npm run dev)
```
