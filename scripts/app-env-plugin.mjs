/**
 * Dev-only /__app-env endpoint for auth invariant checks.
 */
export function appEnvPlugin() {
  return {
    name: "app-env-plugin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        if (pathOnly !== "/__app-env") {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            authEnabled: process.env.VITE_AUTH_ENABLED !== "false",
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
          }),
        );
      });
    },
  };
}
