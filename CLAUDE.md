# beshaped-coach-portal — coach web portal

Where coaches manage clients, review workout/nutrition logs, comment, and build free/paid programs.
Workspace context and cross-repo rules: ../CLAUDE.md. Read the DB schema page in Notion before
any Firestore/Storage work.

## Stack
- Framework: <!-- TODO(claude): Next.js version, app vs pages router --> · UI: <!-- TODO(claude) -->
- Firebase: <!-- TODO(claude): client SDK only, or Admin SDK in server code? -->
- Hosting: Netlify <!-- TODO(claude): confirm, note netlify.toml / env var names (not values) -->

## Commands
<!-- TODO(claude): fill from package.json -->
- Dev: `` · Build: `` · Typecheck: `` · Lint: `` · Test: ``

## Structure
<!-- TODO(claude): 5-10 lines -->

## Conventions
- Every query must be scoped to the signed-in coach's clients (multi-coach). Security rules enforce
  this too; never rely on UI filtering alone.
- Programs created here are consumed by the mobile app and the webapp store; changing their shape is a
  cross-repo change (use /schema-change).
<!-- TODO(claude): more, only if non-obvious -->

## Don't
- Don't deploy or change Netlify settings without asking.
