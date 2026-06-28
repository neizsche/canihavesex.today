# AI Review Guidelines

When reviewing code in this repository, focus on:

1. **The Wedge**: Does this change respect user privacy and avoid dark patterns? (See `AI_CONTEXT.md`).
2. **Engine Safety**: If `engine.ts` is modified, scrutinize it heavily against `docs/design/fertility-engine-v6.md`. Ensure the "unclear = fertile" rule is never compromised.
3. **Token Efficiency**: Does this change add unnecessary abstractions or huge files? Suggest splitting large additions into cohesive modules.
4. **Validation**: Are new API inputs validated via Zod?
5. **Types**: Are there `any` types that should be properly defined?
6. **Documentation**: Did the author update inline JSDoc for new exported functions?

If you spot any violations, suggest concrete code fixes.
