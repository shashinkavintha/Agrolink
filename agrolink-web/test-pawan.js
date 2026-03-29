import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read .env
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envs = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key) envs[key.trim()] = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = envs['VITE_SUPABASE_URL'];
const supabaseKey = envs['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%pawan%');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Found: ", data.length);
  if (data.length > 0) {
    const pawanId = data[0].id;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wilson_score: 0.95,
        rating: 4.8,
        order_defect_rate: 0.5,
        late_shipment_rate: 0.5,
        pre_fulfillment_cancellation_rate: 0.5,
        is_top_seller: true,
        total_orders: 50
      })
      .eq('id', pawanId);
    if (updateError) console.error("Update error:", updateError);
    else console.log("Success! Pawan is now a Top Seller!");
  } else {
    console.log("Could not find a user with pawan in the name");
  }
}
run();
