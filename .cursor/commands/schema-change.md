---
description: Safely change a Firestore collection/field, rules or storage path across all repos
argument-hint: <describe the change>
---
Proposed data change: $ARGUMENTS

1. Fetch the data contract for each affected collection (Data contracts database: https://app.notion.com/p/caaef8effc1942e1b5b590a94bfdd55c) and the Notion DB schema page (https://app.notion.com/p/2f2587cfb078802f9ab0ea805dcc5562).
2. Search all four repos for every read/write of the affected collection/fields/paths and every rule and index
   covering them: `bespoke-fitness/` (GitHub: beshaped-app), `beshaped-coach-portal/`, `beshaped-webapp/` and
   `beshaped-backend/`. In `beshaped-backend/`, always check `firestore.rules`, `storage.rules`,
   `firestore.indexes.json`, `functions/` and `scripts/`. List them with file:line.
   If the current directory is a single repo, use the sibling folders under ../ for the others.
3. Say whether existing production documents need a migration or a backwards-compatible read
   (old + new shape) during rollout, since installed mobile apps can't update instantly.
4. Present a plan: per-repo edits (including `beshaped-backend/functions/` and `scripts/`), rules and index
   changes (`beshaped-backend/firestore.rules`, `storage.rules`, `firestore.indexes.json`, with rules tests in
   `beshaped-backend/tests/`), type updates, the exact contract edits (fields table, invariants, a dated
   change-log line saying what changed and why), the DB schema page edit, rollout order.
   If the change breaks a contract invariant, say so explicitly.
   Wait for approval.
5. After implementing, run each touched repo's typecheck and lint (in `beshaped-backend/`: `npm run build` and
   `npm run test:rules`), then update the contract(s) and the DB schema page
   (only the affected sections) and add a Decision log entry (https://app.notion.com/p/3e5587cfb07881ef9a6ac39d77d9c088) if there was a real trade-off.
