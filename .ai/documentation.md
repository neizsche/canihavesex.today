# AI Documentation Guidelines

When writing or updating documentation in this repository:

1. **Token Efficiency**: Assume every token costs money. Do not repeat explanations across multiple files. Create canonical documents and reference them (e.g., link to `AI_CONTEXT.md`).
2. **JSDoc Standards**: Every exported function must have:
   - Purpose (Why it exists)
   - `@param` (with descriptions)
   - `@returns` (with description)
   - `@throws` (if applicable)
3. **Clarity**: Avoid obvious comments like `// adds two numbers`. Explain the *business reason* or *why* a particular approach was taken.
4. **Structure**: Keep markdown documents organized with clear headings and a table of contents for longer files.
