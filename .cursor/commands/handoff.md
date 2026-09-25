---
description: End-of-session handoff. Records the work in Notion so Luke's Claude chat and Francois can see it
---
Wrap up this session so the work is visible outside this session.

1. Summarise the session: what changed per repo, key files, branch / commits / PR, what was tested and
   how, what is unfinished, decisions made, new risks or questions. Use `git status`, `git log` and the
   diff; don't rely on memory alone.
2. Map the work to Backlog tasks (data source collection://8e6a321d-336b-4e8f-a61a-9451bb569d29). For each task touched, prepare:
   - Status change (e.g. In progress, Done, Blocked). "To verify" tasks found already done -> Done.
   - "Latest update" = "YYYY-MM-DD: <one sentence>" (replace the old value).
   - A page comment with the full summary: what, why, files, commits/PR, how tested, follow-ups.
   Work that matches no task -> a new task with Source "Claude Code session YYYY-MM-DD".
3. Follow-ups discovered -> new Backlog tasks (Status "To do", same Source), with area, type and priority.
4. A decision with a real trade-off -> a Decision log entry (https://app.notion.com/p/3e5587cfb07881ef9a6ac39d77d9c088), newest on top.
   Schema touched -> confirm the data contract and DB schema page were updated; if not, say so.
5. Show me every proposed Notion change as one list. Apply them only after I approve.
6. Finish with a 5-line summary I can paste into Claude chat.
