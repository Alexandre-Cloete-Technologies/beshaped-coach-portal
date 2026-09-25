---
description: Pre-PR check for the current repo
---
1. Run this repo's typecheck, lint and tests (see CLAUDE.md for the commands). Fix what you introduced.
2. Review `git diff main...HEAD` (or the staged diff) for: leftover debug logs, secrets, unrelated
   formatting changes, missing loading/error/empty states, unscoped Firestore queries, entitlement checks
   done only in the UI.
3. If Firestore shapes, rules, or storage paths changed: confirm the collection's data contract (fields + change-log line) and the Notion DB schema page were updated and the
   other repos were checked (otherwise run /schema-change).
4. If a new client-facing feature was added: confirm the Dev Hub's Scope section says whether it's on
   mobile, the members area, or both.
5. Draft a PR title and description (what, why, how to test, screenshots needed).
