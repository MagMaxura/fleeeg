
import pg from 'pg';

const connectionString = 'postgresql://postgres:estoesGRANDE333%23@db.pviwmlbusbuzedtbyieu.supabase.co:5432/postgres';

const { Client } = pg;
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Create driver_locations table
        console.log("Creating driver_locations table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS driver_locations (
                driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                is_online BOOLEAN DEFAULT TRUE
            );
        `);
        console.log("Table created/verified.");

        // 2. Enable Realtime for this table
        console.log("Enabling realtime for driver_locations...");
        await client.query(`
            ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
        `);
        console.log("Realtime enabled.");

    } catch (err) {
        if (err.message.includes("already exists in publication")) {
            console.log("Realtime was already enabled.");
        } else {
            console.error('Operation failed:', err);
        }
    } finally {
        await client.end();
    }
}

main().catch(console.error);
