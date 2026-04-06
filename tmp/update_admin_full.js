
import pg from 'pg';

// URL-encoding the # in the password as %23
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

        // 1. Add 'admin' value to the enum type if it doesn't exist
        try {
            const res = await client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'user_role' AND enumlabel = 'admin'");
            
            if (res.rowCount === 0) {
                console.log("Adding 'admin' to user_role enum...");
                await client.query("ALTER TYPE user_role ADD VALUE 'admin'");
                console.log("'admin' added to enum.");
            } else {
                console.log("'admin' already exists in enum.");
            }
        } catch (e) {
            console.error("Enum update error:", e.message);
        }

        // 2. Update the roles
        const emails = ['maxiuranga5@gmail.com', 'danielomarwillmott@gmail.com'];
        console.log(`Updating roles to 'admin' for: ${emails.join(', ')}`);
        
        const updateRes = await client.query(
            "UPDATE profiles SET role = 'admin' WHERE email = ANY($1)",
            [emails]
        );
        
        console.log(`Updated ${updateRes.rowCount} rows.`);

    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
