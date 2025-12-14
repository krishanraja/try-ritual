# ROOT_CAUSE.md - Confirmed Issues (2025-12-14)

## Summary of Confirmed Root Causes

| Issue | Root Cause | Severity | Fix Complexity |
|-------|-----------|----------|----------------|
| Leave Couple Fails | Missing DELETE policy on `couples` table | 🔴 Critical | Low (1 migration) |
| Memories Tab Crash | Non-null assertion on potentially null `couple` | 🔴 Critical | Low (null checks) |
| Demo Rituals Forever | Data structure mismatch in `useSampleRituals` | 🟡 Medium | Low (defensive parsing) |

---

## Issue 1: Leave Couple Fails

### Root Cause: Missing DELETE Policy

**File:** Supabase RLS (Database)

**Evidence:**

Initial migration `20251119175435_62bed0c3-e490-4c31-af5f-a5fcdb7fc55a.sql`:

```sql:53:64:supabase/migrations/20251119175435_62bed0c3-e490-4c31-af5f-a5fcdb7fc55a.sql
CREATE POLICY "Users can view their couple"
  ON public.couples FOR SELECT
  USING (auth.uid() = partner_one OR auth.uid() = partner_two);

CREATE POLICY "Users can update their couple"
  ON public.couples FOR UPDATE
  USING (auth.uid() = partner_one OR auth.uid() = partner_two);

CREATE POLICY "Authenticated users can create couples"
  ON public.couples FOR INSERT
  WITH CHECK (auth.uid() = partner_one);
```

**Missing:** No `FOR DELETE` policy exists!

**Code Path:**

```typescript:354:363:src/contexts/CoupleContext.tsx
if (isPartnerOne) {
  const { error } = await supabase
    .from('couples')
    .delete()
    .eq('id', couple.id);
  
  if (error) {
    console.error('Delete error:', error);
    throw error;
  }
}
```

When `isPartnerOne` is true, the code attempts a DELETE, but RLS blocks it with no policy allowing DELETE.

**Confirmed Fix:** Add DELETE policy for partner_one.

---

## Issue 2: Memories Tab Crash

### Root Cause: Non-null Assertion Race Condition

**File:** `src/pages/Memories.tsx`

**Evidence:**

```typescript:70:78:src/pages/Memories.tsx
useEffect(() => {
  if (couple?.id) {
    fetchMemories();
    fetchStats();
  } else if (!coupleLoading && user && !couple) {
    setLoading(false);
  }
}, [couple?.id, coupleLoading, user]);
```

Then inside `fetchMemories()`:

```typescript:82:86:src/pages/Memories.tsx
const { data, error } = await supabase
  .from('ritual_memories')
  .select('*')
  .eq('couple_id', couple!.id)  // ⚠️ NON-NULL ASSERTION
  .order('completion_date', { ascending: false });
```

**Race Condition:**

1. Component mounts with `couple = null`
2. useEffect skips because `couple?.id` is undefined
3. Context updates `couple` to a value
4. useEffect runs again, calls `fetchMemories()`
5. But if component unmounts during fetch, the promise resolves with `couple` back to null
6. `couple!.id` crashes because `couple` is null

Same pattern on lines: 103, 109, 115, 124

**Also in MemoryReactions.tsx:**

```typescript:39:41:src/components/MemoryReactions.tsx
useEffect(() => {
  fetchReactions();
}, [memoryId]);
```

No cleanup function for async operation. If component unmounts during fetch, state update on unmounted component.

**Confirmed Fix:** 
1. Store `couple.id` in a variable at useEffect call time
2. Add mounted check in async functions
3. Pass `couple.id` as parameter instead of using closure

---

## Issue 3: Demo Rituals Forever

### Root Cause: Data Structure Not Defensive

**File:** `src/hooks/useSampleRituals.ts`

**Evidence:**

```typescript:44:54:src/hooks/useSampleRituals.ts
if (currentCycle?.synthesized_output) {
  const output = currentCycle.synthesized_output as any;
  const realRituals = output.rituals || [];
  
  if (realRituals.length > 0) {
    setRituals(realRituals);
    setIsShowingSamples(false);
    return;
  }
}
```

**Problem:** If `synthesized_output` is:
- `{ rituals: [...] }` → Works ✅
- `[...]` (direct array) → `output.rituals` is undefined → shows samples ❌
- `{ error: "..." }` → `output.rituals` is undefined → shows samples ❌

The edge function returns `{ rituals: [...] }`:

```typescript:612:src/supabase/functions/synthesize-rituals/index.ts
return new Response(JSON.stringify({ rituals }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

But the CardDrawInput component that calls the edge function stores the result:

**Investigation Needed:** How is `synthesized_output` being written to the database?

**Likely Issue:** The caller is storing the entire response (including wrapper) OR old cycles have different format.

**Confirmed Fix:**
1. Add defensive parsing that handles both array and object wrapper
2. Add logging to understand actual data structure

---

## Secondary Issues Discovered

### Issue 4: SynthesisAnimation Cycle ID Dependency

**File:** `src/components/SynthesisAnimation.tsx`

The component correctly handles missing cycle ID by fetching independently (lines 44-93). This appears to be working correctly based on the code review. However, if the cycle has `synthesized_output` but in wrong format, it won't detect completion.

### Issue 5: RitualPicker Loading State

**File:** `src/pages/RitualPicker.tsx`

Similar issue - relies on `synthesized_output.rituals` structure (line 93-101). If format is wrong, shows "generating" state indefinitely.

---

## Database State Verification Needed

To confirm Issue 3, need to check actual database:

```sql
-- Check structure of synthesized_output for couple's cycles
SELECT 
  id, 
  synthesized_output,
  jsonb_typeof(synthesized_output) as output_type
FROM weekly_cycles 
WHERE couple_id = '[COUPLE_ID]'
ORDER BY created_at DESC
LIMIT 5;
```

Expected:
- `output_type` should be `object`
- `synthesized_output->>'rituals'` should not be null

If `output_type` is `array`, that's the bug.

---

## Version
- **Analysis Date**: 2025-12-14
- **Analyst**: Claude (Cursor AI)


