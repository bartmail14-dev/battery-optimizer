import { initDatabase, closeDatabase } from './client.js';

async function main() {
  console.log('Running database migrations...');
  await initDatabase();
  console.log('Database initialized.');
  closeDatabase();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
