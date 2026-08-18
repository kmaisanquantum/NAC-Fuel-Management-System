import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// NOTE: SQLite is used here to make the MVP runnable without external infra.
// Production deployment uses PostgreSQL — see /database/migrations/001_init.sql
// which defines the equivalent schema with proper UUID/TIMESTAMP/NUMERIC types.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/nac_fms.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initSchema() {
  const candidatePaths = [
    path.join(__dirname, "schema.sql"),
    path.join(__dirname, "../src/db/schema.sql"),
    path.join(__dirname, "../../src/db/schema.sql"),
    path.join(process.cwd(), "apps/api/src/db/schema.sql")
  ];

  let schemaPath: string | undefined;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      schemaPath = candidate;
      break;
    }
  }

  if (!schemaPath) {
    throw new Error(`Failed to locate schema.sql. Checked paths: ${candidatePaths.join(", ")}`);
  }

  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}
