# Contributing to Digital Seed

Thanks for wanting to contribute! This is an alpha project and every contribution helps.

## Easy Contributions

- **New patterns** — Add a folder in `patterns/` with a `system.md` file
- **Documentation** — Fix typos, improve guides, add FAQ entries
- **Integration guides** — Write setup guides for new MCP servers
- **Bug reports** — Open an issue with reproduction steps
- **Platform testing** — Test on Linux, WSL2, different macOS versions

## Development

```bash
# Clone and setup
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install

# Run the dashboard
bun run seed onboard

# Run health check
bun run health
```

## Pull Request Guidelines

1. Keep PRs focused — one feature or fix per PR
2. Test your changes on at least one platform (macOS or Linux)
3. Update relevant documentation
4. Don't commit secrets (the pre-commit hook should catch this)

## Security Issues

Do NOT open public issues for security vulnerabilities.
See [SECURITY.md](SECURITY.md) for responsible disclosure.

## Code of Conduct

Be kind. Be helpful. We're all learning together.
