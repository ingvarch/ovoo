# Contributing to ovoo

Thanks for helping. This file explains how to report problems and how to send a change.

## Report a bug or ask for a feature

Open an issue with one of the [issue templates](https://github.com/ingvarch/ovoo/issues/new/choose).
For a bug, include what you did, what happened and what you expected, the ovoo and Nomad versions,
and whether ovoo runs in Docker or on Cloudflare Workers. Remove ACL tokens and secrets.

For anything bigger than a small fix, open an issue first, so the shape of the change is agreed
before the work is done.

Do not report security problems in public issues. See [SECURITY.md](SECURITY.md).

## Set up

You need [Bun](https://bun.sh/) 1.2+ and a running Nomad cluster with an ACL token. Local setup and
the checks are described in [docs/development.md](https://github.com/ingvarch/ovoo/blob/main/docs/development.md).

## Make a change

1. Create a branch from `main` named `<type>/<short-name>`, for example `fix/exec-early-messages`.
2. Write a failing test that describes the behavior you want, then the code that makes it pass.
   This holds for small functions too.
3. Run the [checks](https://github.com/ingvarch/ovoo/blob/main/docs/development.md#checks). The
   output must have no warnings and no failures. CI runs the same checks on every pull request.
4. Update the files in `docs/` if the change alters what users or operators see.
5. Commit with a [conventional commit](https://www.conventionalcommits.org/) message:
   `type(scope): description`, imperative, lower case.
   - Types: `feat`, `fix`, `refactor`, `docs`, `chore`.
   - Scopes: the part of the app, such as `ui`, `jobs`, `allocations`, `nodes`, `storage`, `exec`,
     `logs`, `pwa`, `api`, `security`, and `deps`, `ci`, `deploy`, `release` for maintenance.
6. Open a pull request and fill in the template. Link the issue it closes with `Closes #N`.

A change also keeps these:

- Both deployment targets work: Cloudflare Workers and Docker. A server change is verified against
  both entries (`entry.cloudflare.ts`, `entry.bun.ts`).
- The Nomad token stays in the `httpOnly` cookie and never reaches a URL, a log line, a response
  body or browser storage.
- Comments are short and say why, not what the line does.

Pull requests are merged with rebase or squash, so `main` keeps a linear history.

The rules for agents working in this repository are in [AGENTS.md](https://github.com/ingvarch/ovoo/blob/main/AGENTS.md).

## Code of conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](https://github.com/ingvarch/ovoo/blob/main/LICENSE).
