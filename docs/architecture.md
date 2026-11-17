# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route-level React components responsible for rendering only. Fetch through the shared API client, and give each capability an accessible loading state, useful empty state, and visible error state. Keep browser requests on relative `/api` paths and preserve the Vite proxy.
- Logic tier decision: Keep HTTP handling in Express routes and capability behavior in `octofitService.ts`. Validate request data before database writes; return deliberate 4xx responses for invalid or missing resources and allow unexpected failures to reach the existing error handler.
- Data tier decision: Use Mongoose models as the persistence contract. Require user name, email, and fitness goal; team name and mascot; activity user, team, type, minutes, points, and occurrence time; and workout title, focus, duration, and difficulty. Default team members to an empty array. Keep seed data idempotent and preserve unrelated existing records.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and positive `minutes`; validate both IDs and confirm both referenced documents exist before creating an activity. Store the user/team references, use minutes as the points value, and set `occurredAt` when the activity is created.
- Team management approach: List teams with their submitted names, mascots, and member IDs. Create teams while preserving those fields, default omitted members to an empty array, and reject a missing name with `400`.
- Leaderboard approach: Aggregate activity points by team, include teams with no activities at zero, sort by total points descending, and assign 1-based ranks in the returned list.
- Workout suggestions approach: Find the user by the requested email; return a 4xx if there is no match. Prefer the focus matching the user's most recent activity, otherwise use their fitness goal; return matching workouts first and include a reason that names the activity or goal behind the recommendation.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
