---
inclusion: always
---

# Systematic Debugging Process

Always find the root cause of any issue. Never fix a symptom or add a workaround instead of finding a root cause, even if it seems faster.

## Phase 1: Root Cause Investigation (before attempting fixes)

- Read error messages carefully. Don't skip past errors or warnings — they often contain the exact solution.
- Reproduce consistently. Ensure you can reliably reproduce the issue before investigating.
- Check recent changes. What changed that could have caused this? Git diff, recent commits, etc.

## Phase 2: Pattern Analysis

- Find working examples. Locate similar working code in the same codebase.
- Compare against references. If implementing a pattern, read the reference implementation completely.
- Identify differences. What's different between working and broken code?
- Understand dependencies. What other components/settings does this pattern require?

## Phase 3: Hypothesis and Testing

1. Form a single hypothesis. What do you think is the root cause? State it clearly.
2. Test minimally. Make the smallest possible change to test your hypothesis.
3. Verify before continuing. Did your test work? If not, form a new hypothesis — don't add more fixes.
4. When you don't know, say "I don't understand X" rather than pretending to know.

## Phase 4: Implementation Rules

- Always have the simplest possible failing test case. If there's no test framework, write a one-off test script.
- Never add multiple fixes at once.
- Never claim to implement a pattern without reading it completely first.
- Always test after each change.
- If your first fix doesn't work, stop and re-analyze rather than adding more fixes.
