# QKSEC Backend

Standalone Node.js API for the QKSEC school dashboard.

## Development

```bash
npm install
npm run dev
```

Run the backend quality checks with:

```bash
npm run typecheck
npm test
npm run build
```

The API is available at `http://localhost:4000`.

- `GET /health`
- `GET /ready` (checks Supabase connectivity)
- `GET /api/v1/health`
- `POST /api/v1/auth/sign-in` and `POST /api/v1/auth/refresh`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/students` and `GET /api/v1/students/:id`
- `GET /api/v1/teachers` and `GET /api/v1/teachers/:id`
- `GET /api/v1/classes` and `GET /api/v1/classes/:id`
- `GET /api/v1/subjects` and `GET /api/v1/subjects/:id`
- `GET /api/v1/announcements` and `GET /api/v1/announcements/:id`
- `GET /api/v1/events` and `GET /api/v1/events/:id`
- `GET /api/v1/lessons` and `GET /api/v1/lessons/:id`
- `GET /api/v1/assignments` and `POST /api/v1/assignments`
- `GET /api/v1/exams` and `POST /api/v1/exams`
- `GET /api/v1/results` and `POST /api/v1/results`
- `GET /api/v1/attendance` and `POST /api/v1/attendance`
- `POST /api/v1/manage/students`
- `POST /api/v1/manage/teachers`
- `POST /api/v1/manage/parents`
- `POST /api/v1/manage/classes`
- `POST /api/v1/manage/subjects`
- `POST /api/v1/manage/lessons`
- `POST /api/v1/manage/events`
- `POST /api/v1/manage/announcements`

All API routes require a Supabase bearer token except health checks. Assignment, exam,
result, and attendance writes require an admin or teacher role. Results and attendance
reads are automatically scoped to the authenticated user's student, linked children, or
assigned classes.

Management create endpoints require an admin role and create the associated Supabase Auth
user/profile records where applicable. Update and delete workflows are not implemented yet.

Copy `.env.example` to `.env` before starting the server.

## Database setup

Apply the migration with the Supabase CLI:

```bash
npx supabase db push
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SEED_USER_PASSWORD`, then seed demo data:

```bash
npm run db:seed
```

The service role key is required only by the seed script and must never be exposed to the frontend.

The frontend can call this API by setting `NEXT_PUBLIC_API_URL` (default: `http://localhost:4000`).
The sign-in endpoint sets the `qksec_access_token` and `qksec_refresh_token` cookies as HttpOnly
cookies. The frontend sends them automatically with credentialed API requests.

The backend also enables security headers and a global rate limit. Configure
`RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` for the deployment environment. Use `/health` for
liveness probes and `/ready` for readiness probes that require the database to be reachable.

Refresh expired access tokens through `/auth/refresh`, and clear both cookies through
`/auth/sign-out` or when refresh fails.

Student and teacher list endpoints accept `page` and `pageSize` query parameters. `pageSize` is
bounded to 100 and paginated responses include `data` plus a `meta` object containing page,
pageSize, total, and totalPages.
