---
description: End-of-session handoff. Records the work on its GitHub issues in Project #3 so Luke's Claude chat and Francois can see it
---
Wrap up this session so the work is visible outside it. Tasks live in GitHub Project #3
(https://github.com/orgs/Alexandre-Cloete-Technologies/projects/3). The Notion Backlog is read-only history:
never edit it (an old BSF-N number is the item's Legacy ID in the Project).

Helper, run from the root Beshaped Fitness folder (from inside a repo: `../tools/github-project/issue.mjs`):
`node tools/github-project/issue.mjs show|set|comment|create|convert ...` (usage at the top of the file).
Refs look like `beshaped-webapp#12`, `backend#45` or `BSF-86`. Add `--dry-run` to check a change without writing.

1. **What the session touched.** For each repo (`bespoke-fitness/` is `beshaped-app` on GitHub,
   `beshaped-coach-portal`, `beshaped-webapp`, `beshaped-backend`): `git status`, the branch, and its commits
   and diff against the default branch (`master` for the coach portal, `main` elsewhere). A branch named
   `<n>-slug` belongs to issue #n in that repo. Find PRs with `gh pr list --head <branch> --state all`. Don't rely
   on memory alone. If it's unclear which issue the work belongs to, ask. No issue at all: propose creating one
   (step 4).
2. **Per issue, prepare** (run `issue.mjs show <ref>` first):
   - Status: In progress; In review when a PR is open; Done when it's merged (the Project's workflows usually
     set this, so check); Blocked, with the reason in the comment.
   - "Latest update" = `YYYY-MM-DD: one line`.
   - A comment with these sections: **What**, **Choices**, **Files**, **How tested**, **Issues along the way**,
     **Follow-ups**. Link the PR and make sure its body says `Closes Alexandre-Cloete-Technologies/<repo>#<n>`
     (fix it with `gh pr edit`). Work committed straight to a default branch: link the commit SHA instead.
   - An epic's sub-issues: a comment on each sub-issue, plus a one-line summary comment on the epic.
   - Drafts can't take comments: put the update in "Latest update", and propose converting the draft to an
     issue (`issue.mjs convert`) when the update is substantial.
3. **Public repos.** Issues and comments in `beshaped-coach-portal` and `beshaped-webapp` are public. Security
   findings, secrets, clients' personal data and commercial terms never go there: put them in a
   `beshaped-backend` issue and link to it. `issue.mjs` refuses such text in a public repo unless you pass
   `--allow-public`; only do that when the match is harmless.
4. **Follow-ups** become new issues with `issue.mjs create`: the right repo, the issue type (Feature,
   Improvement, Bug, Chore, Question), labels (`data-model`, `security-rules`, `admin` as they apply), Priority,
   Scope and Requested by. Cross-repo work: an epic (`--type Epic --labels epic`) in `beshaped-backend` when the
   data model or rules change, otherwise in the leading repo, then one sub-issue per repo with `--parent`.
   Admin-only work: a draft (`--draft`).
5. **Decisions** with a real trade-off: propose a Decision log entry in Notion
   (https://app.notion.com/p/3e5587cfb07881ef9a6ac39d77d9c088), newest on top: date and title, context,
   decision, rejected options, what it affects. If Firestore shapes, rules or Storage paths changed, confirm the
   collection's data contract and the DB schema page were updated; if not, say so.
6. **Approval.** Show every proposed change as one list: per issue the Status, Latest update and comment text;
   the follow-ups; the Decision log entries. Check the writes with `--dry-run` first. Apply only after I approve.
7. Finish with a **5-line summary** for the Hand-offs chat, with the issue refs (`repo#n`).
