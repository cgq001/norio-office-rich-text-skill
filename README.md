# Norio Rich Text Skill

`norio-rich-text/` contains the Skill, examples, schemas, and optional Node.js CLI.
The CLI requires Node.js 20+ and a compatible version of `@norio-office/rich-text`
that exports `ai-protocol` and `nordox`. Copying the Skill alone does not install
the editor package or register AI tools in a host application.

In the main workspace, run `npm run skill:verify` after building the editor
package. Commit Skill changes to the CNB repository first. Once that commit is
on CNB `main`, run `npm run push -- --skills` from the workspace root to publish
only `packages/skills` to the GitHub Skill repository. Ordinary `git pull` and
`git push` still target the CNB repository.
