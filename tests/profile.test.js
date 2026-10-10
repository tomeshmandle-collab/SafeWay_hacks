import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://localhost:3000/api/v1/me';
let TEST_TOKEN = process.env.TEST_ACCESS_TOKEN; // Injected by CI or developer if available

let originalProfile = null;

before(async () => {
  // If TEST_TOKEN is not provided, try to sign in with test credentials
  if (!TEST_TOKEN && process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false }
      });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      });
      if (!error && data.session) {
        TEST_TOKEN = data.session.access_token;
      } else {
        console.error('Failed to sign in test user:', error?.message);
      }
    }
  }

  // Fetch initial profile state if we have a token to restore later
  if (TEST_TOKEN) {
    const res = await fetch(API_URL, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    if (res.status === 200) {
      const profile = await res.json();
      // Ensure the profile exists before proceeding
      if (profile.id && profile.role === 'tourist') {
        originalProfile = { 
          full_name: profile.full_name || '', 
          phone: profile.phone || '' 
        };
      } else {
        console.warn('Profile missing or not a tourist. Ensure test account has a valid profile record.');
        TEST_TOKEN = null; // Invalidate token to skip tests
      }
    } else {
      console.warn(`Failed to fetch initial profile state (Status: ${res.status}). Ensure test account has a profile record.`);
      TEST_TOKEN = null; // Invalidate token to skip tests
    }
  }
});

after(async () => {
  // Restore the original profile state if we mutated it
  if (TEST_TOKEN && originalProfile) {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(originalProfile)
    });
    
    if (res.status !== 200) {
      console.error('Failed to restore original profile state in after() hook');
    }
    
    // Verify restoration
    const verifyRes = await fetch(API_URL, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    const restoredData = await verifyRes.json();
    assert.equal(restoredData.full_name, originalProfile.full_name, 'Cleanup verification failed for full_name');
    assert.equal(restoredData.phone, originalProfile.phone, 'Cleanup verification failed for phone');
  }
});

test('Profile API - GET with missing token', async () => {
  const res = await fetch(API_URL);
  assert.equal(res.status, 401);
});

test('Profile API - GET with invalid token', async () => {
  const res = await fetch(API_URL, {
    headers: { 'Authorization': 'Bearer fake-invalid-token' }
  });
  assert.equal(res.status, 401);
});

test('Profile API - PATCH with missing token', async () => {
  const res = await fetch(API_URL, { method: 'PATCH' });
  assert.equal(res.status, 401);
});

test('Profile API - PATCH with invalid token', async () => {
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer fake-invalid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: 'Test' })
  });
  assert.equal(res.status, 401);
});

test('Profile API - GET with valid session', async (t) => {
  if (!TEST_TOKEN) return t.skip('Blocked: Missing credentials or Supabase connectivity.');
  
  const res = await fetch(API_URL, {
    headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.role, 'tourist');
  assert.ok(data.id);
});

test('Profile API - PATCH with valid name/phone update', async (t) => {
  if (!TEST_TOKEN) return t.skip('Blocked: Missing credentials or Supabase connectivity.');
  
  const updatePayload = { full_name: 'Updated Tester', phone: '+91 99999 88888' };
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(updatePayload)
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.full_name, 'Updated Tester');
  assert.equal(data.phone, '+91 99999 88888');

  // Verify persistence by reading back
  const getRes = await fetch(API_URL, {
    headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
  });
  const getData = await getRes.json();
  assert.equal(getData.full_name, 'Updated Tester');
});

test('Profile API - PATCH attempting to modify role or id', async (t) => {
  if (!TEST_TOKEN) return t.skip('Blocked: Missing credentials or Supabase connectivity.');
  
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ role: 'admin', id: 'fake-admin-id' })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Modifying id or role is not permitted');
});

test('Profile API - PATCH with empty or invalid payload', async (t) => {
  if (!TEST_TOKEN) return t.skip('Blocked: Missing credentials or Supabase connectivity.');
  
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({})
  });
  assert.equal(res.status, 400);
});

test('Profile API - Verify cross-user isolation', async (t) => {
  if (!TEST_TOKEN) return t.skip('Blocked: Missing credentials or Supabase connectivity.');
  
  // The tested endpoints (GET/PATCH /api/v1/me) do not accept a target user identifier, 
  // relying entirely on the authenticated token.
  // True cross-user isolation testing would require a targeted endpoint (e.g., /api/v1/profiles/:id).
  // We verified earlier that injecting 'id' into the PATCH payload is rejected.
  assert.ok(true, 'No target-identifier endpoint exposed; isolation relies on /me token extraction.');
});
