import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import postgres from "postgres";

import { envConfigs } from "@/config";

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: pnpm db:migrate [--dry-run]

Applies SQL files from ./migrations in filename order and records applied files
in a dedicated migration tracking table.
`);
  process.exit(0);
}

const migrationsDir = path.resolve(process.cwd(), "migrations");
const databaseUrl = envConfigs.database_url;
const appSchema = (envConfigs.db_schema || "public").trim();
const trackingSchema = (
  process.env.DB_SQL_MIGRATIONS_SCHEMA ||
  envConfigs.db_migrations_schema ||
  "public"
).trim();
const trackingTable = (
  process.env.DB_SQL_MIGRATIONS_TABLE || "__sql_file_migrations"
).trim();

function quoteIdent(value: string) {
  return `"${value.replaceAll(`"`, `""`)}"`;
}

function qualifiedTableName(schema: string, table: string) {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

function compareFilenames(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort(compareFilenames);
}

async function main() {
  const files = await getMigrationFiles();

  if (files.length === 0) {
    console.log(`No SQL migration files found in ${migrationsDir}`);
    return;
  }

  if (args.has("--dry-run")) {
    console.log(`Discovered ${files.length} SQL migration file(s):`);
    for (const file of files) {
      console.log(`- ${file}`);
    }
    return;
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionSchemaOptions =
    appSchema && appSchema !== "public"
      ? { connection: { options: `-c search_path=${appSchema}` } }
      : {};

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ...connectionSchemaOptions,
  });

  const trackingTableName = qualifiedTableName(trackingSchema, trackingTable);

  try {
    if (trackingSchema && trackingSchema !== "public") {
      await client.unsafe(
        `create schema if not exists ${quoteIdent(trackingSchema)}`,
      );
    }

    await client.unsafe(`
      create table if not exists ${trackingTableName} (
        id serial primary key,
        filename text not null unique,
        hash text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedRows = await client.unsafe<
      Array<{ filename: string; hash: string }>
    >(`select filename, hash from ${trackingTableName}`);
    const appliedByFilename = new Map(
      appliedRows.map((row) => [row.filename, row.hash]),
    );

    let appliedCount = 0;

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const appliedHash = appliedByFilename.get(file);

      if (appliedHash) {
        if (appliedHash !== hash) {
          throw new Error(
            `Migration ${file} was already applied but its contents changed`,
          );
        }

        console.log(`Skipping ${file}`);
        continue;
      }

      await client.begin(async (tx) => {
        await tx.unsafe(sql);
        await tx.unsafe(
          `
            insert into ${trackingTableName} (filename, hash)
            values ($1, $2)
          `,
          [file, hash],
        );
      });

      appliedCount += 1;
      console.log(`Applied ${file}`);
    }

    console.log(`Finished. Applied ${appliedCount} new migration(s).`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
