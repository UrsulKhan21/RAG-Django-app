# Go Live Guide

This app should be deployed in two parts:

1. Backend Django API on Render
2. Frontend Next.js app on Cloudflare

Your database setup is already a good production shape:

- PostgreSQL on Neon
- Qdrant on Qdrant Cloud

Recommended live domain layout:

- Frontend: `https://yourdomain.com`
- Backend API: `https://api.yourdomain.com`

That layout is important because this project uses cookie-based auth. Using sibling domains keeps CORS, cookies, and Google OAuth much simpler than mixing random temporary domains.

## 1. Before You Deploy

Make sure these files exist and are the ones you use:

- Backend env template: [backend/.env.production.example](backend/.env.production.example)
- Render blueprint: [render.yaml](render.yaml)
- Frontend env template: [frontend/rag-frontend/.env.production.example](frontend/rag-frontend/.env.production.example)

Also make sure your code is pushed to GitHub, because both Render and Cloudflare deploy cleanly from Git.

## 2. Prepare Production Values

You will need these real values before going live:

- `DJANGO_SECRET_KEY`
- `DATABASE_URL` from Neon
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `GROQ_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- your final frontend domain
- your final backend API domain

For this project, use values like this:

```env
ALLOWED_HOSTS=api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
FRONTEND_URLS=https://yourdomain.com
COOKIE_SECURE=True
COOKIE_SAMESITE=Lax
COOKIE_DOMAIN=
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback/
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Note:

- Leave `COOKIE_DOMAIN` empty unless you know you need a custom shared cookie domain.
- Keep `COOKIE_SAMESITE=Lax` if frontend and backend use the same root domain such as `yourdomain.com` and `api.yourdomain.com`.
- Do not rely on temporary `onrender.com` and `pages.dev` domains for final auth testing. They are cross-site and can confuse cookie behavior.

## 3. Deploy Backend to Render

### Option A: easiest path in the dashboard

1. Push the repo to GitHub.
2. Log in to Render.
3. Click `New +` -> `Web Service`.
4. Connect your GitHub repo.
5. Set:
   - Root Directory: `backend`
   - Runtime: `Python`
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start Command: `gunicorn rag_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 180`
6. Add the environment variables from [backend/.env.production.example](backend/.env.production.example).
7. Click deploy.

### Option B: blueprint

This repo now includes [render.yaml](render.yaml), so you can also create the service from that blueprint and then fill in the secrets inside Render.

### Backend env vars to add in Render

Set these at minimum:

- `DJANGO_SECRET_KEY`
- `DEBUG=False`
- `ALLOWED_HOSTS=api.yourdomain.com`
- `FRONTEND_URL=https://yourdomain.com`
- `FRONTEND_URLS=https://yourdomain.com`
- `DATABASE_URL=...` from Neon
- `DB_SSL_REQUIRE=True`
- `SECURE_SSL_REDIRECT=True`
- `COOKIE_SECURE=True`
- `COOKIE_SAMESITE=Lax`
- `GROQ_API_KEY=...`
- `QDRANT_URL=...`
- `QDRANT_API_KEY=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback/`

### After Render deploys

Open the Render shell or local terminal and run:

```bash
python manage.py migrate
python manage.py check --deploy
```

If you are migrating old local SQLite data into Neon:

```bash
python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.permission > data.json
python manage.py migrate
python manage.py loaddata data.json
```

Because you already use Neon and Qdrant Cloud, you do not need to move Qdrant data.

### Backend checks

Once Render is live, verify:

1. `https://api.yourdomain.com/admin/login/` opens
2. `https://api.yourdomain.com/api/auth/google/login/` redirects to Google
3. `https://api.yourdomain.com/api/sources/` returns `401` when not logged in

That `401` is healthy for a protected API route.

## 4. Attach Backend Custom Domain

Inside Render:

1. Open your web service
2. Go to `Settings`
3. Add custom domain `api.yourdomain.com`
4. Add the DNS record Render tells you to add
5. Wait for SSL to finish provisioning

Do this before final frontend auth testing.

## 5. Deploy Frontend to Cloudflare

This frontend already has Cloudflare/OpenNext setup:

- [frontend/rag-frontend/open-next.config.ts](frontend/rag-frontend/open-next.config.ts)
- [frontend/rag-frontend/wrangler.jsonc](frontend/rag-frontend/wrangler.jsonc)

### Cloudflare deploy steps

1. In Cloudflare, create a new Worker/Next.js project from GitHub.
2. Point it to `frontend/rag-frontend`.
3. Add env var:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

4. Build the frontend.
5. Deploy.

If you deploy from local CLI instead, use:

```bash
cd frontend/rag-frontend
npm install
npm run deploy
```

## 6. Attach Frontend Custom Domain

In Cloudflare:

1. Open the deployed frontend project
2. Add custom domain `yourdomain.com`
3. Optionally add `www.yourdomain.com` and redirect it to the main domain

After that, your live architecture should be:

- `https://yourdomain.com` -> Cloudflare frontend
- `https://api.yourdomain.com` -> Render backend

## 7. Configure Google OAuth

Open Google Cloud Console and update OAuth settings:

- Authorized JavaScript origin: `https://yourdomain.com`
- Authorized redirect URI: `https://api.yourdomain.com/api/auth/google/callback/`

If you also want local development to keep working, keep the local entries too:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:8000/api/auth/google/callback/`

## 8. Final CORS and Cookie Rules

For this codebase, these production rules matter:

- frontend must call the API with `credentials: "include"`: already implemented
- backend must allow the frontend origin: already supported through `FRONTEND_URL` and `FRONTEND_URLS`
- backend cookies must be secure over HTTPS: now configurable and production-ready
- frontend and backend should use your real domains before testing login

If login works locally but not in production, the first things to check are:

1. frontend domain and backend domain are set correctly
2. `FRONTEND_URL` exactly matches the live frontend URL
3. `GOOGLE_REDIRECT_URI` exactly matches the live API callback URL
4. custom domains are active, not just temporary deploy URLs

## 9. Final Go-Live Test Order

Do these in order:

1. Open the frontend homepage
2. Register with email/password
3. Log out and log back in
4. Test Google login
5. Add a source
6. Ingest the source
7. Open chat and ask a question
8. Refresh the page and confirm the session still works
9. Delete a source and confirm Qdrant cleanup still works

## 10. If Something Fails

Quick triage:

- Render deploy fails at install time: check [backend/requirements.txt](backend/requirements.txt)
- Render deploy fails at boot: check env vars, especially `DJANGO_SECRET_KEY`, `DATABASE_URL`, `QDRANT_URL`, `GROQ_API_KEY`
- Login fails after redirect: check Google OAuth redirect URI and `FRONTEND_URL`
- Logged in once, then API says unauthorized: check cookies, HTTPS, and final domain setup
- Source ingest fails: check Render logs for model download, memory usage, Groq key, and Qdrant connectivity

## 11. Recommended First Live Launch Path

Use this exact order:

1. Deploy backend to Render
2. Run migrations
3. Connect `api.yourdomain.com`
4. Deploy frontend to Cloudflare
5. Connect `yourdomain.com`
6. Update Google OAuth
7. Test email login
8. Test Google login
9. Test source ingestion and chat

If you want, I can take the next step and prepare a very short `copy/paste` checklist just for Render settings and Cloudflare settings using your real domain names. 
