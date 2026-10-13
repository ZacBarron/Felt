// Writes a consistent copy of the Felt database. Safe while the server runs.
// Usage: node backup.cjs [output file]
// Reads DATABASE_PATH like the server. The copy defaults to felt-backup.sqlite next to it.
const { existsSync, rmSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const source = process.env.DATABASE_PATH ?? './data/felt.sqlite';
const out = process.argv[2] ?? join(dirname(source), 'felt-backup.sqlite');
if (!existsSync(source)) {
  console.error(`No database at ${source}`);
  process.exit(1);
}
if (existsSync(out)) rmSync(out);
const db = new DatabaseSync(source);
db.exec('PRAGMA busy_timeout = 5000');
db.exec(`VACUUM INTO '${out.replaceAll("'", "''")}'`);
db.close();
console.log(`Backup written to ${out}`);
