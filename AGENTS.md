# Guidelines for Codex Agents

## Scope
These instructions apply to the entire repository.

## Commit Style
- Use small, focused commits.
- Commit messages should start with a short imperative summary (no period).
- Optionally add a blank line followed by more details if necessary.

## Code Style
- Use 2 spaces for indentation in TypeScript and JavaScript files.
- Always include semicolons.
- Prefer React functional components with explicit types.
- Use Tailwind CSS classes for styling.

## Testing
Run the following commands before committing:

```bash
npm run lint
npm run typecheck
```

If these commands fail because dependencies are missing or the environment lacks network access, mention that in your PR description.
