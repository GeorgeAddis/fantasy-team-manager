# Fantasy Team Manager API (Laravel)

**DRF equivalent:** Eloquent models + **Form Requests** (validation) + **JsonResource** (serializers) + **`Route::apiResource()`** (ViewSets-style CRUD).

Base URL (local): `http://localhost:8000/api/v1`

| Method | URL | Action |
|--------|-----|--------|
| GET | `/leagues` | list (paginated) |
| POST | `/leagues` | create |
| GET | `/leagues/{id}` | retrieve |
| PUT/PATCH | `/leagues/{id}` | update |
| DELETE | `/leagues/{id}` | delete |

Same pattern for:

- `/teams`
- `/irl-franchises`
- `/players`
- `/lineup-slots`

**Headers:** `Accept: application/json`  
**Body (POST/PATCH):** `Content-Type: application/json`

### Enums

**Player `position`:** `QB`, `RB`, `WR`, `TE`, `K`, `DST`

**Lineup slot `lineup_position`:** `QB`, `RB1`, `RB2`, `WR1`, `WR2`, `WR3`, `RWT`, `K`, `DST`, `BN`

### Example: create league

```http
POST /api/v1/leagues
{"name": "Work League"}
```

### Example: create team

```http
POST /api/v1/teams
{"name": "My Squad", "league_id": 1, "my_team": true}
```

Run migrations:

```bash
php artisan migrate
```
