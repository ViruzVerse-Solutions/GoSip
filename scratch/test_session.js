const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ypmplltikpknlmwftveu.supabase.co';
const supabaseKey = 'sb_publishable_XGPBvKNmipzMekFCr8P1eA_tIjW9kl1'; // anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching branches...");
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, slug, is_active');

  if (error) {
    console.error("Error fetching branches:", error);
    return;
  }

  console.log("Branches count:", data.length);
  data.forEach(b => {
    console.log(`ID: ${b.id} | Name: ${b.name} | Slug: ${b.slug} | Active: ${b.is_active}`);
  });
}

main().catch(console.error);
