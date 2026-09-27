# beshaped-coach-portal — coach web portal

Where coaches manage clients, review workout/nutrition logs, comment, and build free/paid programs.
Workspace context and cross-repo rules: ../CLAUDE.md. Read the DB schema page in Notion before
any Firestore/Storage work.

## Stack
- Framework: Next.js 16.1 (App Router, React 19.2); pages are client components that call Firestore
  directly · UI: Tailwind v4 + shadcn/ui config (`components.json`, new-york), lucide-react icons
- Firebase: client SDK only (`lib/firebase/`); no Admin SDK, no server actions or API routes
- Hosting: Netlify (inferred: no `netlify.toml` in this repo). Env vars: `NEXT_PUBLIC_FIREBASE_*`
- Default branch is `master` (the other two repos use `main`)

## Commands
- Dev: `npm run dev` · Build: `npm run build` · Typecheck: `npx tsc --noEmit` · Lint: `npm run lint` · Test: none
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
- Auth (BSF-71): `lib/auth/AuthProvider` + `AuthGuard` wrap every route except `/login`. Access needs the Auth
  custom claim `role` = `coach` | `admin` (`users.role` is not trusted). Pages call `useSignedInCoach()`.
- Every client query goes through `lib/coachScope.ts`: a coach sees `users` with `assignedCoachId == uid`,
  an admin sees all clients; child data (userPrograms, logs) is read only for that set, in chunks of 30
  for `in` queries. Until owner/coach security rules exist this is UI-only; don't read `users` unscoped.
- Programs created here are consumed by the mobile app and the webapp store; changing their shape is a
  cross-repo change (use /schema-change).
- Assigning a program writes `users.availablePrograms` (array of program refs) + `users.currentProgram` (ref),
  creates one `userPrograms` doc on first assignment, and seeds `to-be-completed` `workoutLogs`
  (`lib/workoutLogSeed.ts`). The seeded logs use `startedAt`/`completedAt` and a **reference** `programId`;
  mobile writes `timeStartedAt`/`timeCompletedAt` and a **string** `programId`. Readers must handle both until unified.
- `AddClientModal` creates the Auth user with the client SDK (`createUserWithEmailAndPassword`), which
  signs the coach in as the new client (confirmed in the emulator 2026-09-28: the auth guard then signs
  them out, and with sign-in-required rules the `users` doc write is denied, leaving an orphan Auth user). Moving client
  creation to a Cloud Function / Admin SDK is the fix; don't copy this pattern.
- `createdBy` on programs/exercises/workouts is a literal (`"coach"` / `"admin"`), not a uid.

## Don't
- Don't deploy or change Netlify settings without asking.
