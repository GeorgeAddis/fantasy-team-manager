# Push to GitHub

This folder is its **own git repo** (so it’s not tied to the parent `programming_projects` folder).

## 1. Create the repo on GitHub

1. Open [github.com/new](https://github.com/new).
2. **Repository name:** e.g. `fantasy-team-manager` (or whatever you like).
3. Leave **empty** — no README, no .gitignore, no license (you already have files locally).
4. Create repository.

## 2. Connect and push (HTTPS)

Replace `YOUR_USERNAME` and `REPO_NAME`:

```powershell
cd C:\Users\georg\Documents\programming_projects\fantasy-football

git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

GitHub will ask you to sign in. Prefer a **Personal Access Token** as the password (Settings → Developer settings → Personal access tokens), not your account password.

## 2b. Or SSH (if you use SSH keys)

```powershell
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

## 3. Optional: parent folder `programming_projects`

If you also use git in `programming_projects`, **unstage** `fantasy-football` there so you don’t commit the same tree twice:

```powershell
cd C:\Users\georg\Documents\programming_projects
git reset HEAD fantasy-football
```

You can add `fantasy-football/` to that repo’s `.gitignore` if you only want the nested repo on GitHub.

## What’s not in git (by design)

- `backend/vendor/` — run Composer / Docker init
- `frontend/node_modules/` — run `npm install`
- `backend/.env` — secrets; use `.env.example` / `.env.postgres.example`
