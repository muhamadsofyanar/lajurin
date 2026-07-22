import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const database = drizzle(pool);
const requiredTables = ["users", "merchant_profiles", "products", "orders", "enrollments", "merchant_ledger_entries", "webhook_events"];

try {
  await migrate(database, { migrationsFolder: "./drizzle" });
  const first = await pool.query("SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations");
  await migrate(database, { migrationsFolder: "./drizzle" });
  const second = await pool.query("SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations");

  if (first.rows[0].count !== second.rows[0].count) throw new Error("Rerun migrasi menambah journal baru");

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [requiredTables],
  );
  const present = new Set(tables.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !present.has(table));
  if (missing.length) throw new Error(`Tabel baseline hilang: ${missing.join(", ")}`);

  console.info(JSON.stringify({ level: "info", event: "migrations_valid", applied: second.rows[0].count }));
} finally {
  await pool.end();
}
