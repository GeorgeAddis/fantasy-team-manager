# Frontend data layer

| Layer | Path | Use when |
|-------|------|----------|
| **API functions** | `src/api/*.js` | Non-React code, scripts, or manual `await` |
| **Hooks** | `src/hooks/use*.js` | Components (caching, loading, mutations) |

## API (plain functions)

```js
import { createLeague, listLeagues } from '@/api'
// or
import * as leaguesApi from '@/api/leagues'

await createLeague({ name: 'Work league' })
const page = await listLeagues({ page: 1 })
// page.data — rows; page.meta — Laravel pagination
```

## Hooks (TanStack Query)

```js
import { useLeagueList, useCreateLeague } from '@/hooks'

function Leagues() {
  const { data, isPending, error } = useLeagueList()
  const create = useCreateLeague()
  // data?.data — list; create.mutate({ name: '...' })
}
```

## Dev server

- App: **http://localhost:3000**
- API calls go to **`/api/v1/...`** (Vite proxies to `http://localhost:8000`).

## Production

Set `VITE_API_URL=https://your-api-host` (no trailing slash). Then requests hit `$VITE_API_URL/api/v1/...` (configure CORS on Laravel).
