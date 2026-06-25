export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getMigrations } = await import("better-auth/db/migration");
      const { auth } = await import("@/app/api/auth/auth");
      
      console.log("Checking Better Auth database migrations... DATABASE_URL =", process.env.DATABASE_URL);
      const { runMigrations, toBeCreated, toBeAdded } = await getMigrations(auth.options);
      
      const needsMigration = toBeCreated.length > 0 || toBeAdded.length > 0;
      if (needsMigration) {
        console.log(`Applying Better Auth migrations... (Tables to create: ${toBeCreated.map((t) => t.table).join(", ")}, Columns to add: ${toBeAdded.map((c) => `${c.table} [${Object.keys(c.fields).join(", ")}]`).join(", ")})`);
        await runMigrations();
        console.log("Better Auth database migrations applied successfully.");
      } else {
        console.log("Better Auth database is up to date.");
      }
    } catch (error) {
      console.error("Error executing Better Auth migrations on startup:", error);
    }
  }
}
