# beshaped-coach-portal — coach web portal

Where coaches manage clients, review workout/nutrition logs, comment, and build free/paid programs.
Workspace context and cross-repo rules: ../CLAUDE.md. Read the DB schema page in Notion before
any Firestore/Storage work.

## Stack
- Framework: Next.js 16.4.5 (App Router, React 19.2); pages are client components that call Firestore
  directly · UI: Tailwind v4 + shadcn/ui config (`components.json`, new-york), lucide-react icons
- Firebase: client SDK only (`lib/firebase/`); no Admin SDK, no server actions or API routes. Server-side work is a
  callable in beshaped-backend, called through `lib/firebase/functions.ts`
- Hosting: Netlify site `beshaped-coach-portal` (https://beshaped-coach-portal.netlify.app): builds from `master`,
  deploy previews on PRs. Production env vars (`NEXT_PUBLIC_FIREBASE_*`, prod project) are set in Netlify;
  `NEXT_PUBLIC_USE_EMULATORS` must never be set there (the build refuses it). No `netlify.toml`.
- Default branch is `master` (the other three repos use `main`)

## Commands
- Dev: `npm run dev` · Build: `npm run build` · Typecheck: `npx tsc --noEmit` · Lint: `npm run lint` · Test: `npm test` (Node test runner, `lib/*.test.ts`, pure helpers only)
- Emulators: `npm run dev:emulators` + `npm run seed:emulator` (see README). `firebase-admin` is a devDependency
  for the seed script only; the app itself stays client-SDK-only.

## Structure
- `app/page.tsx`: dashboard · `app/clients/` list + `[id]/` (programs, workout history, nutrition, progress)
- `app/programs/`: list, `builder/`, `[id]/`; editor logic in `programs/lib/useProgramEditor.ts` (form shape +
  `toFirestorePayload`) and `programs/lib/workoutLogSync.ts` (rewrites clients' open workoutLogs when a program changes)
- `app/workouts/`, `app/exercises/`: saved-workout and exercise libraries · `app/assessment/`: check-in form (WIP)
- `app/components/`: shared modals and cards (`AddClientModal`, `AssignProgramModal`, `AnatomyGifPicker`, …)
- `lib/firebase/`: `config`, `auth`, generic `firestore` CRUD, `storage` upload helpers · `lib/workoutLogSeed.ts`

## Conventions
- Auth (BSF-71, beshaped-coach-portal#37): `lib/auth/AuthProvider` + `AuthGuard` wrap every route except `/login`. Access needs the Auth
  custom claim `role` = `coach` | `admin` (`users.role` is not trusted). Pages call `useSignedInCoach()`.
- Every client query goes through `lib/coachScope.ts`: a coach sees `users` with `assignedCoachId == uid`,
  an admin sees all clients; child data (userPrograms, logs) is read only for that set, in chunks of 30
  for `in` queries. Until owner/coach security rules exist this is UI-only; don't read `users` unscoped.
- Programs created here are consumed by the mobile app and the webapp store; changing their shape is a
  cross-repo change (use /schema-change).
- Links between docs are id strings (beshaped-backend#29, #38): `userId` is the uid, `workoutLogs.programId` and
  `userPrograms.programId` the program's doc id. Only `users.availablePrograms` / `users.currentProgram` stay
  references. Never write a `DocumentReference` into a link field.
- Assigning a program (`lib/programAssignment.ts`) writes `users.availablePrograms` + `users.currentProgram`,
  creates that program's `userPrograms` doc if the client has none for it, and seeds a `to-be-completed`
  workoutLog per program day (`lib/workoutLogSeed.ts`). A program log's doc id is
  `workoutLogId()` = `{uid}_{programId}_r{round}_{phaseId}_w{week}d{day}` (the phase's `phaseId`, which must stay
  stable and never be reused), the same rule as the mobile app, so the
  app fills the seeded slot. Seeding and the program-edit sync (`workoutLogSync.ts`) only create missing days,
  refresh scheduled ones, keep logged sets on started ones and never touch completed or skipped logs
  (workoutLogs data contract). Logs use `timeStartedAt`/`timeCompletedAt`.
- `AddClientModal` creates clients through the `createClient` callable (`lib/createClient.ts`, region `africa-south1`,
  beshaped-backend#37): the backend creates the Auth user and `users/{uid}` with the Admin SDK and rolls both back on
  failure, so the coach stays signed in. Nobody types a client's password (Decision log 2026-10-29, D2; the backend
  refuses one): the form asks for the email twice, and after the call the portal sends the set-password email with
  `sendPasswordResetEmail` (`resetPassword` in `lib/firebase/auth.ts`) and shows "Invite sent to <email>". The client page
  has a "Send set-password email" button for a lost invite (a coach's own clients, any client for an admin: the page's
  scope). The portal then calls `assignProgramToClient` for `userPrograms` and the seeded logs. Backend error messages
  map to text in `lib/createClientErrors.ts`, invite-email errors in `lib/clientInvite.ts`. Clients only
  (`role: "client"`); staff accounts are made with `set-role-claims.ts` in beshaped-backend (#42). The client SDK no
  longer creates other people's accounts: don't bring that back.
- `createdBy` on programs/exercises is a literal (`"coach"` / `"admin"`), not a uid. On `workouts` it is the
  signed-in coach's uid, with `createdByRole` from the claim.

## Don't
- Don't deploy or change Netlify settings without asking.
