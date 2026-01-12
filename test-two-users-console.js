/**
 * Two-User Flow Test Script
 * 
 * Run this in browser console to test the two-user flow programmatically.
 * 
 * Usage:
 * 1. Open http://localhost:8085 in Tab 1
 * 2. Open browser console (F12)
 * 3. Copy and run this script
 * 4. Follow the prompts
 */

// Get Supabase client from window
const supabase = window.supabase || (() => {
  // Try to get from React context
  const reactRoot = document.querySelector('#root')._reactInternalFiber;
  // Fallback: import from module
  console.warn('Supabase client not found on window. Make sure you\'re on the app page.');
  return null;
})();

async function testTwoUserFlow() {
  console.log('🧪 Starting Two-User Flow Test...\n');
  
  try {
    // Step 1: Create User 1
    console.log('📝 Step 1: Creating User 1 (Alex)...');
    const { data: user1Data, error: user1Error } = await supabase.auth.signUp({
      email: `alex-${Date.now()}@test.com`,
      password: 'TestPass123!',
      options: {
        data: {
          name: 'Alex'
        }
      }
    });
    
    if (user1Error) throw user1Error;
    console.log('✅ User 1 created:', user1Data.user.email);
    
    // Step 2: Create Couple
    console.log('\n💑 Step 2: Creating couple...');
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .insert({
        partner_one: user1Data.user.id,
        couple_code: `TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        is_active: true,
        code_expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()
      })
      .select()
      .single();
    
    if (coupleError) throw coupleError;
    console.log('✅ Couple created with code:', coupleData.couple_code);
    console.log('📋 Share this code with User 2:', coupleData.couple_code);
    
    // Step 3: Create User 2 (in different browser context)
    console.log('\n📝 Step 3: Instructions for User 2:');
    console.log('1. Open http://localhost:8085 in a new tab/incognito window');
    console.log('2. Sign up with:');
    console.log('   - Name: Sam');
    console.log('   - Email: sam@test.com');
    console.log('   - Password: TestPass123!');
    console.log('3. Click "Join Your Partner"');
    console.log('4. Enter code:', coupleData.couple_code);
    console.log('5. Once joined, both users can test the ritual flow');
    
    return {
      user1: user1Data.user,
      couple: coupleData,
      code: coupleData.couple_code
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.testTwoUserFlow = testTwoUserFlow;
  console.log('✅ Test script loaded! Run: testTwoUserFlow()');
}
