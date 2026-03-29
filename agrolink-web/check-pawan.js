import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envs = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key) envs[key.trim()] = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(envs['VITE_SUPABASE_URL'], envs['VITE_SUPABASE_ANON_KEY']);

async function run() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, is_top_seller')
    .ilike('email', '%pawan%');
  
  if (error) console.error(error);
  else {
    console.log(data);
    if(data.length > 0) {
        const id = data[0].id;
        console.log("Run this command:");
        console.log(`curl -X POST http://localhost:8080/api/profiles/${id}/recalculate-ranks`);
    }
  }
}
run();
