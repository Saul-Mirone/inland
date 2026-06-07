# Inland

> [!WARNING]
> WIP

Markdown-based documentation management system. Connects to GitHub. Based on Milkdown.

## Quick start

Inland ships as a Docker Compose stack. Pre-built images are published to GHCR:

- `ghcr.io/saul-mirone/inland-backend`
- `ghcr.io/saul-mirone/inland-frontend`

Tags: `latest` (main), `main`, `sha-<short>`, and semver (`X.Y.Z`, `X.Y`) on `v*` git tags.

You do **not** need to clone the repo — just two files (`docker-compose.yml` and `.env.production`) are enough.

### 1. Create a GitHub OAuth App

Inland uses GitHub for authentication.

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**
2. Set:
   - **Homepage URL** — your Inland URL (e.g. `https://inland.example.com`)
   - **Authorization callback URL** — `<homepage>/api/auth/github/callback`
3. Generate a client secret. Keep the client ID and secret.

### 2. Download the stack files

```bash
mkdir inland && cd inland

# docker-compose.yml — defines the services
curl -fsSL -o docker-compose.yml \
  https://raw.githubusercontent.com/Saul-Mirone/inland/main/docker-compose.yml

# .env.production — environment variables (template)
curl -fsSL -o .env.production \
  https://raw.githubusercontent.com/Saul-Mirone/inland/main/.env.production.example
```

### 3. Configure environment

Edit `.env.production` and fill in:

| Variable                                   | Description                                             |
| ------------------------------------------ | ------------------------------------------------------- |
| `POSTGRES_PASSWORD`                        | Database password (any strong value)                    |
| `JWT_SECRET`, `SESSION_SECRET`             | Random secrets, ≥32 bytes each (`openssl rand -hex 32`) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | From step 1                                             |
| `AUTH_CALLBACK_URL`, `APP_URL`, `API_URL`  | Public URLs of your deployment                          |
| `PORT`                                     | Host port for the frontend (default `80`)               |
| `INLAND_TAG`                               | Image tag to deploy (`latest`, `X.Y.Z`, or `sha-...`)   |

### 4. Run

```bash
docker compose --env-file .env.production up -d
```

This pulls the GHCR images and brings up PostgreSQL, Redis, the backend (runs database migrations on startup), and the frontend (nginx serving the SPA and reverse-proxying `/api/` to the backend).

Check status:

```bash
docker compose ps
docker compose logs -f
```

Open `http://localhost:${PORT}` (or your domain) and sign in with GitHub.

## HTTPS

The bundled `docker-compose.yml` serves plain HTTP. For any deployment exposed to the internet, put a TLS-terminating reverse proxy (Caddy, Traefik, or a cloud load balancer) in front of the frontend container and update `AUTH_CALLBACK_URL` / `APP_URL` / `API_URL` to `https://`.

## Updating

```bash
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d
```

Database migrations run automatically on backend startup.

## Backup

Persistent data lives in two named volumes: `inland_postgres_data` and `inland_redis_data`. Back up the PostgreSQL volume regularly:

```bash
docker compose --env-file .env.production exec postgres \
  pg_dump -U "${POSTGRES_USER:-inland}" "${POSTGRES_DB:-inland}" > inland-$(date +%F).sql
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development setup, architecture, and conventions.
