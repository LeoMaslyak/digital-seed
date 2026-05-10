# Fabric Integration

Use Daniel Miessler's [Fabric](https://github.com/danielmiessler/fabric) patterns alongside Digital Seed.

## Install Fabric

```bash
# Using Go
go install github.com/danielmiessler/fabric@latest

# Or download a binary from releases
# https://github.com/danielmiessler/fabric/releases
```

## Configure

```bash
fabric --setup
```

This will configure your model providers (same API keys as your AI tools).

## Using Fabric Patterns with Digital Seed

Fabric has 252+ patterns. Use them directly from the CLI:

```bash
# Summarize content
echo "paste content here" | fabric -p summarize

# Extract wisdom from a YouTube video
fabric -y "https://youtube.com/watch?v=..." -p extract_wisdom

# Analyze a paper
cat paper.pdf | fabric -p analyze_paper
```

Or reference them from your AI agent:

```
"Use the Fabric 'extract_wisdom' pattern on this article"
```

## Digital Seed vs Fabric Patterns

Digital Seed includes its own patterns in `patterns/` that are complementary:
- Digital Seed patterns are structured for MCP-connected agents (read context, use tools)
- Fabric patterns are designed for CLI piping (stdin → stdout)

Use both — they work together.
