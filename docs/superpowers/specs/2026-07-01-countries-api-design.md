# Countries REST API — Design Spec

Date: 2026-07-01
Status: Approved (design phase) — implementation to happen in a **new repository**, not in `vanilla-countries`.

## 1. Intent

`vanilla-countries` currently bundles a static `assets/countries.json` (250 countries, read-only) fetched once by the frontend and looked up in memory by ISO alpha-2 code (`cca2`). See `main.js` (`CONFIG.COUNTRIES_DATA_URL`, `loadCountriesData`, `fetchCountryByCode`, `normalizeCountryData`).

This project replaces that static file with a standalone REST API — same information content, backed by a real relational database — as a portfolio piece demonstrating Python/FastAPI/SQLAlchemy/PostgreSQL. It is **not** wired into the existing frontend for now (CORS left open for easy testing, but no changes to `main.js`/`index.html` in this repo).

Scope is intentionally **read-only**: list countries, filter, search, paginate, and fetch by code. No create/update/delete — mirrors what the dataset is used for today.

## 2. Stack

- Python
- FastAPI (async)
- Uvicorn (ASGI server)
- PostgreSQL
- SQLAlchemy 2.0, async (`asyncpg` driver, `AsyncSession`/`create_async_engine`)
- Alembic, async template (`alembic init -t async`), migrations run via `async_engine_from_config` in `env.py`
- pytest + pytest-asyncio + httpx (`ASGITransport`) for tests
- Docker Compose for local dev (Postgres + API)

## 3. Architecture / project layout

```
app/
├── main.py                    # FastAPI() instance, CORS(*), router registration
├── core/
│   └── config.py              # pydantic-settings: DATABASE_URL, CORS origins, etc.
├── db/
│   ├── base.py                 # SQLAlchemy DeclarativeBase
│   └── session.py              # create_async_engine, async_sessionmaker, get_session dependency
├── models/
│   ├── country.py               # Country ORM model
│   ├── language.py              # Language ORM model
│   ├── currency.py              # Currency ORM model
│   └── associations.py          # country_languages, country_currencies, country_borders join tables
├── schemas/
│   └── country.py               # Pydantic: CountryRead, LanguageRead, CurrencyRead, PaginatedCountries
├── repositories/
│   └── countries.py             # query layer: list (filters+pagination), get_by_code
└── api/
    └── routes/
        ├── countries.py         # GET /countries, GET /countries/{cca2}
        └── health.py            # GET /health

alembic/
├── env.py                       # async template, target_metadata = Base.metadata
├── versions/
│   ├── 0001_schema.py            # creates all tables
│   └── 0002_seed_countries.py    # data migration: reads seed/countries.json, op.bulk_insert
└── seed/
    └── countries.json           # copy of today's assets/countries.json — single source for the seed

tests/
├── conftest.py                  # async test client + test DB fixtures (insert small fixed dataset, truncate between tests)
└── test_countries.py

docker-compose.yml               # postgres + api services, healthchecks
Dockerfile
pyproject.toml / requirements.txt
.env.example
README.md
```

Layering: routes → repository → models. Routes stay thin (parse params, call repository, return schema); repository owns all query construction; models are plain ORM mappings.

## 4. Data model

Relational model (not a JSONB blob) — chosen because `languages` and `currencies` are shared across many countries, and `borders` is naturally a self-referential relationship. Normalizing these demonstrates real SQLAlchemy relationship patterns without being overkill for 250 rows.

- **`countries`**: `id` (PK), `cca2` (unique, indexed), `flag`, `name_common`, `name_official`, `capital` (`ARRAY(String)`, Postgres-native — almost all countries have exactly one, a few have two), `population` (nullable), `area` (nullable), `region` (indexed — used as a filter), `subregion`
- **`languages`**: `id` (PK), `code` (ISO 639, unique), `name`
- **`currencies`**: `id` (PK), `code` (ISO 4217, unique), `name`, `symbol`
- **`country_languages`**: join table, `country_id` FK → `countries.id`, `language_id` FK → `languages.id`
- **`country_currencies`**: join table, `country_id` FK → `countries.id`, `currency_id` FK → `currencies.id`
- **`country_borders`**: self-referential join table, `country_id` FK → `countries.id`, `border_country_id` FK → `countries.id`

`capital` is kept as a simple array column rather than normalized — it's almost always single-valued, so a separate table would add no value.

### Seeding

- Migration `0001_schema` creates all tables via `op.create_table`.
- Migration `0002_seed_countries` reads `alembic/seed/countries.json` (a copy of the current `assets/countries.json`) at migration-run time, transforms it, and inserts via `op.bulk_insert` in dependency order: `languages`, `currencies` (deduplicated across the whole dataset) → `countries` → `country_languages`, `country_currencies`, `country_borders` (second pass, once all `cca2` → `id` mappings are known).
- No separate seed script needed for normal setup — `alembic upgrade head` fully provisions the database.

## 5. API surface

| Method & Path | Description |
|---|---|
| `GET /health` | Liveness check, used by Docker Compose healthcheck |
| `GET /countries` | Paginated list. Query params: `region` (exact match), `subregion` (exact match), `search` (case-insensitive partial match on `name_common` or `name_official`), `limit` (default 50, max 250), `offset` (default 0). Response: `{items: CountryRead[], total: int, limit: int, offset: int}` |
| `GET /countries/{cca2}` | Single country by ISO alpha-2 code, case-insensitive. 404 with a clear error body if not found |

### Response shape (`CountryRead`)

Mirrors the fields available today, reconstructed from the relational model via Pydantic (`from_attributes=True`):

```json
{
  "cca2": "AD",
  "flag": "🇦🇩",
  "name": { "common": "Andorra", "official": "Principality of Andorra" },
  "capital": ["Andorra la Vella"],
  "population": 81938,
  "area": 468,
  "region": "Europe",
  "subregion": "Southern Europe",
  "languages": [{ "code": "cat", "name": "Catalan" }],
  "currencies": [{ "code": "EUR", "name": "Euro", "symbol": "€" }],
  "borders": ["FR", "ES"]
}
```

## 6. Testing strategy

- pytest + pytest-asyncio + httpx `AsyncClient` (`ASGITransport`) against the FastAPI app.
- Tests run against the same Postgres used by Compose (a dedicated test database/schema), not SQLite — the `ARRAY(String)` column type and relational joins are Postgres-specific.
- Fixtures insert a small, fixed set of countries directly via the ORM (not the full 250-row seed migration), and truncate relevant tables between tests, so test data is predictable and fast.
- Cases covered: basic list, filter by `region`, filter by `subregion`, `search` by name, pagination (`limit`/`offset`/`total` correctness), get-by-code success, get-by-code 404.

## 7. Commit plan (for implementation in the new repo)

1. `chore: scaffold project structure and dependency management` — pyproject/requirements, `.gitignore`, `.env.example`, empty package structure with `__init__.py`
2. `chore: add Dockerfile and docker-compose (api + postgres)` — Compose services with healthchecks
3. `feat: add FastAPI app skeleton with settings and health endpoint` — `core/config.py` (pydantic-settings), `main.py`, open CORS, `GET /health`
4. `feat: add async SQLAlchemy engine and session dependency` — `db/base.py`, `db/session.py`, `get_session`
5. `feat: add ORM models for countries, languages, currencies and relations` — full `models/` package including associations and the self-referential borders relationship
6. `feat: add Alembic async setup and initial schema migration` — `alembic init -t async`, configured `env.py`, migration `0001` (schema only)
7. `feat: seed countries data via Alembic data migration` — copy `assets/countries.json` into `alembic/seed/`, migration `0002` with `bulk_insert`
8. `feat: add Pydantic response schemas for countries` — `schemas/country.py`
9. `feat: add countries repository with filtering and pagination` — `repositories/countries.py`
10. `feat: add countries API routes` — `api/routes/countries.py`, wired into `main.py`
11. `test: add pytest async test suite for countries endpoints` — `conftest.py` fixtures + `test_countries.py`
12. `docs: add README with setup, architecture and API usage` — how to run (`docker compose up`), run migrations, example requests/responses

## 8. Explicitly out of scope (YAGNI)

- Write endpoints (create/update/delete countries)
- Authentication/authorization
- Direct integration with the `vanilla-countries` frontend (future work, not part of this plan)
- API versioning, rate limiting, caching layer
