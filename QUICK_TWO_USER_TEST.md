# Quick Two-User Test Guide

## Fastest Way to Test Two Users

### Method 1: Two Browser Windows (Recommended)

1. **Window 1 (User 1 - Alex):**
   ```
   - Open http://localhost:8085
   - Click "Start Your Ritual"
   - Sign up: alex@test.com / TestPass123!
   - Create couple space
   - Copy the code (e.g., ABCD-1234)
   ```

2. **Window 2 (User 2 - Sam):**
   ```
   - Open http://localhost:8085 in NEW window/incognito
   - Click "Join Your Partner"  
   - Sign up: sam@test.com / TestPass123!
   - Enter code: ABCD-1234
   - Join couple
   ```

3. **Test Flow:**
   - Both navigate to /flow
   - User 1: Select 3-5 cards → Submit
   - User 2: Select 3-5 cards → Submit
   - Wait for synthesis (10-20s)
   - Both rank top 3 rituals
   - Both select availability
   - Test match phase
   - Confirm ritual
   - Test post-ritual check-in
   - Test photo upload
   - Test memory reactions

### Method 2: Browser Console Script

1. **Tab 1:** Open console, run:
```javascript
// Create User 1 and couple
const { data: { user: u1 } } = await supabase.auth.signUp({
  email: `alex-${Date.now()}@test.com`,
  password: 'TestPass123!',
  options: { data: { name: 'Alex' } }
});

const { data: couple } = await supabase.from('couples').insert({
  partner_one: u1.user.id,
  couple_code: 'TEST-CODE',
  is_active: true,
  code_expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()
}).select().single();

console.log('Code:', couple.couple_code);
```

2. **Tab 2:** Sign up manually, then join with the code from Tab 1

## What to Test

✅ **Partner Joining**
- Code entry validation
- Success states
- Error handling (invalid/expired codes)
- Real-time updates when partner joins

✅ **Ritual Input**
- Card selection (3-5 cards)
- Submit button states
- Waiting for partner
- Partner progress indicators

✅ **Synthesis**
- Loading animation
- Timeout handling (30s)
- Retry mechanism
- Error states

✅ **Picking Phase**
- Ranking rituals (top 3)
- Availability selection
- Partner picks visible
- Submit validation

✅ **Match Phase**
- "Great Minds" celebration
- Ritual carousel
- Time slot selection
- Conflict warnings

✅ **Confirmed Phase**
- Success animation
- Calendar integration
- Share functionality

✅ **Memories**
- Photo upload
- Reactions (real-time)
- Memory viewing
- Stats display

## Expected Behavior

- **Smooth:** All transitions should be smooth
- **Clear:** Every action should have clear feedback
- **Helpful:** Error messages should guide users
- **Fast:** Loading states should be minimal
- **Beautiful:** Every screen should feel polished

## Issues to Watch For

- Stuck loading screens
- Missing error messages
- Confusing button states
- Broken real-time updates
- Poor mobile experience
- Accessibility issues

---

**Note:** All critical issues have been fixed. This testing verifies the complete two-user experience works seamlessly.
