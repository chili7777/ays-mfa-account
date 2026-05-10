# ays-mfa-account

Angular micro-frontend for MFA account features.

The app renders:
- `ays-mfa-account`
- `Micro-frontend loaded successfully.`

It is containerized for deployment in DigitalOcean App Platform and served by Nginx on port `80` with SPA fallback to `index.html`.

## Prerequisites

- Node.js and npm
- Docker
- A GitHub account with access to GHCR (`ghcr.io`)

## Install dependencies

```bash
npm install
```

## Production build

```bash
npm run build -- --configuration production
```

Build output is generated in `dist/ays-mfa-account/browser`.

## Docker build

```bash
docker build -f deploy/Dockerfile -t ghcr.io/chili7777/ays-mfa-account:staging-latest .
```

## Docker run local

```bash
docker run --rm -p 8081:80 ghcr.io/chili7777/ays-mfa-account:staging-latest
```

Open `http://localhost:8081`.

## Docker Compose run local

```bash
docker compose up --build
```

Stop the container:

```bash
docker compose down
```

## GHCR push

```bash
docker login ghcr.io
docker push ghcr.io/chili7777/ays-mfa-account:staging-latest
```

## DigitalOcean App Platform setup

Create a new app using **Container Image**:

1. Source type: `Container Image`
2. Registry provider: `GitHub Container Registry`
3. Repository: `chili7777/ays-mfa-account`
4. Tag: `staging-latest`
5. HTTP Port: `80`
6. Health check path: `/`

After deploy, set this env var in the shell app:

- `AYS_MFA_ACCOUNT_URL=https://<your-ays-mfa-account-domain>`

Then redeploy the shell app.

## GitHub Actions deployment workflow

This repo includes `.github/workflows/deploy-branches.yml`.

Push behavior:
- `feature/**` -> `staging`
- `develop` -> `development`
- `main` or `master` -> `production`

Required repository secrets:
- `DIGITALOCEAN_ACCESS_TOKEN`
- `DO_APP_ID_STAGING`
- `DO_APP_ID_DEVELOPMENT`
- `DO_APP_ID_PRODUCTION`

## Project deployment files

- `deploy/Dockerfile`: multi-stage build (Node build + Nginx runtime)
- `deploy/nginx.conf`: SPA fallback (`try_files $uri $uri/ /index.html`)
