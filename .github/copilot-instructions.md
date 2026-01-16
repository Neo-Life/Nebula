# AstrBot Development Instructions

AstrBot is a multi-platform LLM chatbot and development framework written in Python with a Vue.js dashboard. It supports multiple messaging platforms (QQ, Telegram, Discord, etc.) and various LLM providers (OpenAI, Anthropic, Google Gemini, etc.).

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Install Dependencies
- **Python 3.10+ required** - Check `.python-version` file
- Install UV package manager: `pip install uv`
- Install project dependencies: `uv sync` -- takes 6-7 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
- Create required directories: `mkdir -p data/plugins data/config data/temp`

### Running the Application
- Run main application: `uv run main.py` -- starts in ~3 seconds
- Application creates WebUI on http://localhost:6185 (default credentials: `astrbot`/`astrbot`)

### Dashboard Build (Vue.js/Node.js)
- **Prerequisites**: Node.js 20+ and npm 10+ required
- Navigate to dashboard: `cd dashboard`
- Install dashboard dependencies: `npm install` -- takes 2-3 minutes. NEVER CANCEL. Set timeout to 5+ minutes.
- Build dashboard: `npm run build` -- takes 25-30 seconds. NEVER CANCEL.
- Dashboard creates optimized production build in `dashboard/dist/`

### Testing
- Do not generate test files for now.

### Code Quality and Linting
- Install ruff linter: `uv add --dev ruff`
- Check code style: `uv run ruff check .` -- takes <1 second
- Check formatting: `uv run ruff format --check .` -- takes <1 second
- Fix formatting: `uv run ruff format .`
- **ALWAYS** run `uv run ruff check .` and `uv run ruff format .` before committing changes

### Plugin Development
- Plugins load from `astrbot/builtin_stars/` (built-in) and `data/plugins/` (user-installed)
- Plugin system supports function tools and message handlers
- Key plugins: python_interpreter, web_searcher, astrbot, reminder, session_controller

### Common Issues and Workarounds
- **Dashboard download fails**: Known issue with "division by zero" error - application still works
- **Import errors in tests**: Ensure `uv run` is used to run tests in proper environment
- **Build timeouts**: Always set appropriate timeouts (10+ minutes for uv sync, 5+ minutes for npm install)

## CI/CD Integration
- GitHub Actions workflows in `.github/workflows/`
- Docker builds supported via `Dockerfile`
- Pre-commit hooks enforce ruff formatting and linting

## Docker Support
- Primary deployment method: `docker run soulter/astrbot:latest`
- Compose file available: `compose.yml`
- Exposes ports: 6185 (WebUI), 6195 (WeChat), 6199 (QQ), etc.
- Volume mount required: `./data:/AstrBot/data`

## Multi-language Support
- Documentation in Chinese (README.md), English (README_en.md), Japanese (README_ja.md)
- UI supports internationalization
- Default language is Chinese

Remember: This is a production chatbot framework with real users. Always test thoroughly and ensure changes don't break existing functionality.

## Upstream Sync / PR Merge Prompt Template

Use the following prompt when you need Copilot/LLM help to merge an upstream-sync PR into this repo while preserving local custom changes.

```text
You are working in a forked repository that is no longer connected to GitHub fork network.
We rely on GitHub Actions (or a sync branch) to bring upstream changes, and we must preserve our own custom modifications.
Please follow a strict “rebase/merge PR branch onto latest base, then verify, then merge into master” workflow.

GOAL
- Merge the PR/sync branch while keeping our custom changes.

CONSTRAINTS
1) Do NOT merge an old-base PR branch directly into master.
	First update the PR branch to the latest `origin/master` (prefer merging `origin/master` into the PR branch to preserve commits).
2) Resolve conflicts with minimal changes; no refactors or style-only rewrites.
3) Before merging back to master, run and pass:
	- `pnpm -s -C dashboard run typecheck`
	If it fails, fix until it passes.
4) README conflicts: default to keeping THIS repo’s disclaimer/README variant unless explicitly requested otherwise.
5) First classify the change:
	- If it’s a full upstream sync: accept large diffs, but produce a directory-level diff summary and a list of overlaps with our customized files.
	- If it’s a single feature PR: avoid pulling large history; prefer cherry-pick / extracting only the relevant commits/files.

REQUIRED PROCEDURE (provide short git output summary after each step)
1) `git fetch origin`
2) Show:
	- `git status -sb`
	- `git log --oneline --decorate -n 10`
	- `git diff --stat origin/master..PR_HEAD`
3) Switch to PR branch:
	- `git switch -c pr/<name> origin/<pr-branch>`
4) Update PR branch base:
	- `git merge origin/master`
	- Resolve conflicts; do NOT merge into master yet.
5) Verify:
	- `pnpm -s -C dashboard run typecheck`
6) Commit the “PR branch base sync” merge commit with message:
	- `merge: sync origin/master into pr/<name>`
7) Merge into master:
	- `git switch master`
	- `git merge --no-ff pr/<name>`
	- Re-run `pnpm -s -C dashboard run typecheck`
8) Push:
	- `git push origin master`

OUTPUT REQUIREMENTS
- List concrete user-visible feature changes (by module/behavior, not only filenames).
- State whether upstream changes overlap with our customized files and what the impact is.
- Give a clear “safe to push?” recommendation.
```
