const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const projectRef = 'pcqxbpgeyozmfximphba';
const dbPassword = process.argv[2] || '7+%8%yu3bbJkstH';

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'eu-west-1',
  'ap-northeast-1',
  'ap-southeast-2',
];

async function tryConnect(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@${host}:65432/postgres?sslmode=require`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log(`Trying ${region} (${host})...`);
    await client.connect();
    console.log(` CONNECTED via ${region}!`);
    return client;
  } catch (err) {
    console.log(`Failed on ${region}: ${err.message}`);
    await client.end().catch(() => {});
    return null;
  }
}

async function run() {
  let client = null;
  for (const reg of regions) {
    client = await tryConnect(reg);
    if (client) break;
  }

  if (!client) {
    console.error('\nCould not connect via pooler. Please check credentials or region.');
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\nExecuting schema.sql...');
    await client.query(sql);

    console.log('\n Migration completed successfully!');
    console.log('All tables, policies, and API permissions are now active in Supabase.');
  } catch (err) {
    console.error('SQL Execution error:', err.message);
  } finally {
    await client.end();
  }
}

run();
