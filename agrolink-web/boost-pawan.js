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

const supabaseUrl = envs['VITE_SUPABASE_URL'];
const supabaseKey = envs['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: pawanData, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('full_name', '%pawan%')
    .limit(1);
    
  if (!pawanData || pawanData.length === 0) return console.log("No Pawan found");
  
  const pawanId = pawanData[0].id;
  
  // Also we need a buyer id
  const { data: buyerData } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  const buyerId = buyerData[0].id;

  // Let's just insert 20 fake 5-star profile_reviews to artificially boost the wilson score.
  // Wait, RankingService looks at the 'reviews' table, where 'reviewee_id' = farmerId
  const fakeReviews = Array.from({length: 20}).map((_, i) => ({
    reviewer_id: buyerId,
    reviewee_id: pawanId,
    rating: 5,
    comment: "Excellent fake review for wilson score boost " + i
  }));
  
  const { error: revErr } = await supabase.from('reviews').insert(fakeReviews);
  if (revErr) {
    console.log("Error inserting reviews", revErr);
    return;
  }
  
  console.log("Inserted 20 fake 5-star reviews for Pawan.");
  
  // Now triggering recalculation by setting total_orders just in case, but actually wait, we can just trigger the backend recalculate endpoint
  // ProfileController has: @PostMapping("/{id}/recalculate-ranks")
}
run();
