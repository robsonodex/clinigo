const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envObj = {};
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...vals] = line.split('=');
        envObj[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
    }
});

const supabase = createClient(envObj.NEXT_PUBLIC_SUPABASE_URL, envObj.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('users').select('*').limit(1).then(({data, error}) => {
    console.log('users DATA:', JSON.stringify(data, null, 2));
    console.log('users ERROR:', error);
});
