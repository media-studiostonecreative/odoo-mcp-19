// Test-only stub for the `server-only` package. The real package throws
// when imported outside a Server Component bundling context; under Vitest
// (plain Node, no "react-server" condition) that would trip on every
// server module's `import "server-only"` guard, so vitest.config.ts aliases
// the package to this no-op for tests only. Production builds still use
// the real package via Next.js's own resolution.
export {};
