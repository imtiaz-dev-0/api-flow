# Contributing to api-flow

Thank you for your interest in contributing! We welcome all contributions — bug fixes, features, documentation, and tests.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+

```sh
git clone https://github.com/api-flow/api-flow.git
cd api-flow
pnpm install
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Watch mode |
| `pnpm test:coverage` | Coverage report |
| `pnpm build` | Build the package |
| `pnpm lint` | Lint source files |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format with Prettier |
| `pnpm typecheck` | TypeScript type check |
| `pnpm docs:dev` | Start docs dev server |

## Project Structure

```
src/
├── core/           # Client, types, request/response builders
├── auth/           # Token refresh manager
├── cache/          # Memory cache
├── retry/          # Retry engine
├── queue/          # Offline request queue
├── interceptors/   # Before/after hooks
├── events/         # Typed event emitter
├── plugins/        # Plugin system
├── logger/         # Dev logger
├── metrics/        # Performance metrics
├── adapters/       # Fetch + Axios adapters
├── hooks/          # React hooks
├── ssr/            # SSR helpers
└── utils/          # Shared utilities

tests/              # Mirrors src/ structure
docs/               # VitePress documentation
```

## Commit Convention

We use [Conventional Commits](https://conventionalcommits.org):

```
feat: add cursor pagination support
fix: resolve race condition in refresh manager
docs: update React hooks examples
chore: upgrade vitest to v1.2
```

Commits are enforced by `commitlint` via Husky.

## Adding a Changeset

For user-facing changes, add a changeset before opening your PR:

```sh
pnpm changeset
```

Follow the prompts to describe the change and select the semver bump type.

## Pull Request Guidelines

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Write tests for your changes (aim for 90%+ coverage)
4. Run `pnpm test` and `pnpm build` — both must pass
5. Add a changeset if your change is user-facing
6. Open a PR using the provided template

## Code Style

- TypeScript strict mode is required
- No `any` unless absolutely necessary (use `unknown`)
- Prefer `const` over `let`
- All public functions must have JSDoc comments
- No external runtime dependencies (devDependencies are fine)

## Questions?

Open a [Discussion](https://github.com/api-flow/api-flow/discussions) or reach out on [Twitter](https://twitter.com/apiflow_dev).
