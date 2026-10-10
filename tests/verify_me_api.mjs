import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const API_URL = 'http://localhost:3000/api/v1/me';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = `test_tourist_${Date.now()}@gmail.com`;
  const password = 'TestPassword123!';
  
  console.log(`Signing up new test user: ${email}`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authErr) {
    console.error("Signup failed:", authErr);
    process.exit(1);
  }

  const token = authData.session?.access_token;
  if (!token) {
    console.error("No session token returned on signup. Email confirmation might be required.");
    // Wait, let's try to just use authData.session or we might need to use a real existing account if email confirm is on.
    // Let's print out what we got:
    console.log("Auth Data:", authData);
    if (!authData.session) {
      console.log("Since email confirmation is likely enabled, we can't test this way without confirming.");
      process.exit(1);
    }
  }

  console.log("Session obtained. Testing GET /api/v1/me ...");
  
  let res = await fetch(API_URL, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  let data = await res.json();
  console.log("GET /api/v1/me status:", res.status);
  console.log("GET /api/v1/me response:", data);
  
  if (data.role !== 'tourist') {
    console.error("Expected role tourist, got", data.role);
  }

  console.log("\nTesting PATCH /api/v1/me (valid fields)...");
  res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ full_name: 'Test Tourist Updated', phone: '+91 99999 88888' })
  });
  data = await res.json();
  console.log("PATCH (valid) status:", res.status);
  console.log("PATCH (valid) response:", data);

  console.log("\nTesting PATCH /api/v1/me (attempting to update role/id)...");
  res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'admin', id: 'some-fake-id' })
  });
  data = await res.json();
  console.log("PATCH (invalid) status:", res.status);
  console.log("PATCH (invalid) response:", data);

  process.exit(0);
}

run();
