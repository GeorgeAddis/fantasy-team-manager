Approach:
Think before acting. Read existing files before writing code.
Be concise in output but thorough in reasoning.
Prefer editing over rewriting whole files.
Do not re-read files you have already read unless the file may have changed.
No sycophantic openers or closing fluff.
Keep solutions simple and direct.
User instructions always override this file.

Never run PHPUnit, `artisan test`, or Feature/`RefreshDatabase` tests. The Docker Postgres DB is live user data; tests already wiped it once. The user validates in the browser. Do not migrate:fresh, db:wipe, or truncate unless explicitly asked.