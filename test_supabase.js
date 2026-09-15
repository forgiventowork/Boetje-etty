const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://jjqqgtdptqjwydqbgdqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXFndGRwdHFqd3lkcWJnZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDE2MjksImV4cCI6MjEwNDk3NzYyOX0.TwhCQqip_t0tWSQP43WE3eJgyjPhq3eVToMALWcFH1U';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    try {
        const { data: settings, error: errS } = await supabase.from('settings').select('*').eq('id', 1).single();
        console.log('Settings:', settings, errS);
        const { data: members, error: errM } = await supabase.from('members').select('*').order('created_at', { ascending: true });
        console.log('Members err:', errM);
        const { data: payments, error: errP } = await supabase.from('payments').select('*');
        console.log('Payments err:', errP);
        console.log('Success! Members:', members.length);
    } catch(e) {
        console.error('CRASH:', e);
    }
}
test();
