
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pviwmlbusbuzedtbyieu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aXdtbGJ1c2J1emVkdGJ5aWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMjUxMywiZXhwIjoyMDY4Nzg4NTEzfQ.MBl0zUNnVPKPmvNabr3LPU-NEG-eMwzC58PhQ3yRRmY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const emails = ['maxiuranga5@gmail.com', 'danielomarwillmott@gmail.com'];

async function updateRoles() {
    console.log(`Updating roles to 'admin' for: ${emails.join(', ')}`);
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .in('email', emails);

    if (error) {
        console.error('Error updating roles:', error);
    } else {
        console.log('Roles updated successfully for:', emails);
    }
}

updateRoles().catch(console.error);
