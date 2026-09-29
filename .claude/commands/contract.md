---
description: Draft or update the Notion data contract for one Firestore collection from the code
argument-hint: <collection name>
---
Collection: $ARGUMENTS

Data contracts database: https://app.notion.com/p/caaef8effc1942e1b5b590a94bfdd55c (data source collection://532c5471-e700-4aff-847e-d3967eaa027f). DB schema page: https://app.notion.com/p/2f2587cfb078802f9ab0ea805dcc5562.
Use the `orders` contract as the reference for format and level of detail.

1. Fetch the contract page for this collection (query the data source by the Collection title) and the
   collection's section on the DB schema page.
2. Search all four repos for every read and write of the collection and every rule and index covering it:
   `bespoke-fitness/` (GitHub: beshaped-app), `beshaped-coach-portal/`, `beshaped-webapp/` and `beshaped-backend/`.
   In `beshaped-backend/`, always check `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `functions/`
   and `scripts/`. List them with file:line. If the current directory is a single repo, use the sibling folders
   under ../ for the others.
3. Draft the contract in the same structure as `orders`: Purpose, Document ID, Fields table
   (Field | Type | Req | Written by | Why / rules), Invariants, Access, Queries & indexes, Lifecycle, Change log.
   - "Written by" = which repo/function actually writes the field, from the code.
   - "Why / rules": only state a rationale you can see in code, comments, commit messages or the Notion
     pages. Otherwise write "(inferred)" before your best guess, or "? ask Luke/Francois". Never present a
     guess as fact.
   - Access: cite the matching rules in `beshaped-backend/firestore.rules` (and `storage.rules` for the
     collection's Storage paths) with file:line.
   - Queries & indexes: list each query in the code with its `beshaped-backend/firestore.indexes.json` entry,
     or say that none is needed or that it's missing.
   - Flag fields in code but missing from the schema page, and vice versa. Flag type mismatches between repos.
4. Show me the draft and the list of open questions. Wait for approval.
5. On approval, replace the contract page content, set Status = Draft (Agreed only if I say so), set
   Written by / Read by / Doc ID / Summary / Last reviewed, and keep the existing Known issues until resolved.
   Don't edit application code.
