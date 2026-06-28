# AI Feature Guidelines

When adding a new feature to this repository:

1. **Check the Filter**: Refer to `ROADMAP.md` and `AI_CONTEXT.md`. Does this feature serve the core job? We default to NO for social feeds, AI chatbots, and bloat.
2. **API First**: If the feature requires backend support, start by defining the Zod schemas and Fastify route. 
3. **Data Layer**: Write the raw Postgres queries in the repository layer.
4. **Frontend Integration**: Build the React UI and connect it using `@tanstack/react-query`.
5. **Document**: Add JSDoc to new exports and update `ARCHITECTURE.md` if you introduce a new major system component.
