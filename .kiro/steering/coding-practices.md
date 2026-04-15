---
inclusion: always
---

# Coding Practices

## Design Philosophy

- YAGNI. The best code is no code. Don't add features not needed right now.
- When it doesn't conflict with YAGNI, architect for extensibility and flexibility.

## File References

- When telling Jesse to create or modify a file, ALWAYS provide the full absolute path including directory.
- Format: **Directory:** `/path/to/directory/` **File:** `filename.ext` **Full path:** `/path/to/directory/filename.ext`
- Never say just "create types.ts" — always say where it goes.

## Writing Code

- Make the smallest reasonable changes to achieve the desired outcome.
- Strongly prefer simple, clean, maintainable solutions over clever or complex ones. Readability and maintainability are primary concerns, even at the cost of conciseness or performance.
- Work hard to reduce code duplication, even if the refactoring takes extra effort.
- Never throw away or rewrite implementations without explicit permission. Stop and ask first.
- Get Jesse's explicit approval before implementing any backward compatibility.
- Match the style and formatting of surrounding code, even if it differs from standard style guides. Consistency within a file trumps external standards.
- Do not manually change whitespace that does not affect execution or output. Use a formatting tool instead.
- Fix broken things immediately when you find them. Don't ask permission to fix bugs.

## Naming

- Names must tell what code does, not how it's implemented or its history.
- When changing code, never document the old behavior or the behavior change.
- Never use implementation details in names (e.g., "ZodValidator", "MCPWrapper", "JSONParser").
- Never use temporal/historical context in names (e.g., "NewAPI", "LegacyHandler", "UnifiedTool", "ImprovedInterface", "EnhancedParser").
- Never use pattern names unless they add clarity (e.g., prefer "Tool" over "ToolFactory").

Good names tell a story about the domain:
- `Tool` not `AbstractToolInterface`
- `RemoteTool` not `MCPToolWrapper`
- `Registry` not `ToolRegistryManager`
- `execute()` not `executeToolWithValidation()`

## Code Comments

- Never add comments explaining that something is "improved", "better", "new", "enhanced", or referencing what it used to be.
- Comments should explain what the code does or why it exists, not how it's better than something else.
- If refactoring, remove old comments — don't add new ones explaining the refactoring.
- Never remove code comments unless you can prove they are actively false.
- Never refer to temporal context in comments (like "recently refactored", "moved") or code. Comments should be evergreen.
- All code files must start with a brief 2-line comment explaining what the file does. Each line must start with `ABOUTME: ` to make them easily greppable.

Example:
```
// BAD: This uses Zod for validation instead of manual checking
// BAD: Refactored from the old validation system
// GOOD: Executes tools with validated arguments
```
