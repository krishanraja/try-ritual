# DIAGNOSIS.md - Full User Flow Audit (2025-12-14)

## Reported Issues

1. **Leaving a couple** - functionality broken
2. **Memories tab** - causes app to crash
3. **Demo rituals forever** - both users stuck looking at demo rituals while loading real results

---

## PHASE 1: Complete Problem Scope

### Architecture Map

```
App.tsx (Router)
└── CoupleProvider (Global State)
    └── AppShell (Navigation)
        └── Routes:
            ├── Landing.tsx (/)
            │   ├── ViewType: 'loading' | 'marketing' | 'welcome' | 'waiting-for-partner' | 'synthesis' | 'waiting-for-input' | 'dashboard'
            │   ├── SynthesisAnimation (when both submitted, awaiting synthesis)
            │   └── WaitingForPartner (when user submitted, partner hasn't)
            ├── QuickInput.tsx → CardDrawInput
            ├── RitualPicker.tsx (after synthesis)
            │   ├── step: 'rank' | 'schedule' | 'waiting' | 'agreement' | 'generating'
            │   └── AgreementGame
            ├── RitualCards.tsx (after agreement)
            │   └── useSampleRituals hook (CRITICAL: source of demo rituals)
            ├── Memories.tsx
            │   └── MemoryCard → MemoryReactions
            └── Profile.tsx
                └── LeaveConfirmDialog
```

### Call Graph for Each Issue

#### Issue 1: Leave Couple Flow
```
Profile.tsx
  → handleLeaveCouple() (line 152-160)
    → LeaveConfirmDialog.onConfirm (line 43-50)
      → CoupleContext.leaveCouple() (line 346-385)
        → IF partner_one: DELETE FROM couples
        → ELSE: UPDATE couples SET partner_two = null
        → Clear local state (couple, partnerProfile, currentCycle)
        → navigate('/')
```

#### Issue 2: Memories Tab Flow
```
Memories.tsx
  → useEffect (line 70-78)
    → IF couple?.id: fetchMemories()
      → supabase.from('ritual_memories').select('*').eq('couple_id', couple!.id)
    → IF couple?.id: fetchStats()
      → Multiple queries with couple!.id (non-null assertion)
  
  → MemoryCard (for each memory)
    → MemoryReactions (line 113)
      → fetchReactions() (line 66-79)
        → supabase.from('memory_reactions').select('*').eq('memory_id', memoryId)
```

#### Issue 3: Demo Rituals / Real Rituals Flow
```
RitualCards.tsx
  → useSampleRituals hook (line 33)
    → Checks currentCycle?.synthesized_output (line 44-54)
      → IF output.rituals exists and length > 0: show real rituals
      → ELSE: show sample rituals
  → setRituals(fetchedRituals) (line 60)

Landing.tsx
  → currentView === 'synthesis' (line 334)
    → SynthesisAnimation component
      → Polls for synthesized_output
      → When detected: navigate('/picker')

RitualPicker.tsx
  → Loads rituals from currentCycle.synthesized_output (line 93-101)
  → IF no rituals: step = 'generating' (shows loading state)
```

---

## Observed Issues & File References

### ISSUE 1: Leaving a Couple

| File | Line | Problem |
|------|------|---------|
| `CoupleContext.tsx` | 354-374 | RLS policy may not allow partner_one to DELETE, or partner_two to UPDATE |
| `CoupleContext.tsx` | 379 | `navigate('/')` happens before state fully clears - race condition |
| `Profile.tsx` | 152-159 | Error handling shows notification but user is already navigating away |

**Potential RLS Issues:**
- Partner_one DELETE policy may require `is_active = true` check
- Partner_two UPDATE policy may have incorrect conditions

### ISSUE 2: Memories Tab Crash

| File | Line | Problem |
|------|------|---------|
| `Memories.tsx` | 71 | `if (couple?.id)` check, but then line 85 uses `couple!.id` (non-null assertion) |
| `Memories.tsx` | 103, 109, 115, 124 | Same pattern - `couple!.id` without guard in async function |
| `MemoryReactions.tsx` | 66-79 | `fetchReactions()` doesn't handle case where table/RLS denies access |
| `MemoryReactions.tsx` | 39-41 | useEffect with no guard for unmounted component |

**Race Condition:**
1. Component mounts, `couple` is undefined
2. useEffect at line 70 fires with `couple?.id` as undefined → skips
3. Context updates, `couple` becomes defined
4. useEffect fires again with `couple?.id` → calls `fetchMemories()`
5. BUT if user navigates away during fetch, component unmounts → crash

### ISSUE 3: Demo Rituals Forever

| File | Line | Problem |
|------|------|---------|
| `useSampleRituals.ts` | 44-54 | Checks `synthesized_output.rituals` but old cycles may have different structure |
| `useSampleRituals.ts` | 46 | `output.rituals \|\| []` - if output is already an array, this returns `[]` |
| `RitualCards.tsx` | 60-78 | Depends entirely on hook, no fallback logic |
| `SynthesisAnimation.tsx` | 52-55, 82-85 | Checks `synthesized_output` but not `synthesized_output.rituals` |

**Data Structure Issue:**
The `synthesized_output` field in `weekly_cycles` may contain:
- Expected: `{ rituals: [...] }`
- Possible legacy: `[...]` (direct array)
- Possible error: `{ error: "..." }` or `null`

---

## Two-Person Flow Audit Matrix

### Scenario 1: Partner 1 Creates Space, Partner 2 Joins

| Step | P1 State | P2 State | Expected | Actual | Status |
|------|----------|----------|----------|--------|--------|
| P1 creates couple | `couple.partner_two = null` | N/A | Shows "Waiting for Partner" | ✅ Works | OK |
| P2 enters code | N/A | Opens JoinDrawer | JoinDrawer opens | ✅ Works | OK |
| P2 submits code | N/A | Joins couple | Both see /input | Needs verification | 🔍 |
| P1 submits input | `partner_one_input` set | N/A | P1 sees WaitingForPartner | ✅ Works | OK |
| P2 submits input | N/A | `partner_two_input` set | Both see SynthesisAnimation | 🔍 | **VERIFY** |
| Synthesis completes | `synthesized_output` set | `synthesized_output` set | Both navigate to /picker | 🔍 | **VERIFY** |
| P1 ranks rituals | preferences saved | N/A | P1 sees "waiting" | ✅ Works | OK |
| P2 ranks rituals | N/A | preferences saved | Both see AgreementGame | 🔍 | **VERIFY** |
| Agreement reached | `agreed_ritual` set | `agreed_ritual` set | Both navigate to /rituals | 🔍 | **VERIFY** |
| P1 goes to Memories | N/A | N/A | Shows empty state | 🔴 | **CRASH REPORTED** |
| P1 leaves couple | DELETE or UPDATE | Partner sees change | Both reset | 🔴 | **BROKEN** |

### Scenario 2: Both Users Joined, Mid-Cycle

| Step | P1 State | P2 State | Expected | Actual | Status |
|------|----------|----------|----------|--------|--------|
| Load /rituals | Has `agreed_ritual` | Has `agreed_ritual` | Shows real rituals | 🔴 | **SHOWS DEMO** |
| Load /picker | Has `synthesized_output` | Has `synthesized_output` | Shows ranking UI | 🔍 | **VERIFY** |

---

## Data Flow Analysis

### `synthesized_output` Structure Investigation

The `useSampleRituals` hook expects:
```typescript
const output = currentCycle.synthesized_output as any;
const realRituals = output.rituals || [];
```

But if the edge function returns:
```typescript
// Old format (direct array)
[{ title: "...", description: "..." }, ...]

// Current format
{ rituals: [{ title: "...", description: "..." }, ...] }

// Error format
{ error: "API failure" }
```

The hook will fail silently and show sample rituals.

### CoupleContext Stale Closure

In `CoupleContext.tsx` lines 297-324, the realtime subscription for `weekly_cycles` uses:
```typescript
if (newData?.couple_id) {
  await fetchCycle(newData.couple_id);
}
```

This is correct (uses payload data, not stale closure). ✅

However, the `couple` variable used elsewhere in the effect could be stale.

---

## Hypothesis Summary

1. **Leave Couple Fails**: RLS policy blocks DELETE/UPDATE, or navigation races state cleanup
2. **Memories Crash**: `couple!.id` non-null assertion when `couple` is undefined due to race condition
3. **Demo Rituals Forever**: `synthesized_output` structure doesn't match expected `{ rituals: [...] }` format

---

## Required Verification Steps

### Step 1: Check Database Directly
```sql
-- Check RLS policies for couples table
SELECT * FROM pg_policies WHERE tablename = 'couples';

-- Check synthesized_output structure for current couple
SELECT id, synthesized_output FROM weekly_cycles 
WHERE couple_id = '[COUPLE_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

### Step 2: Add Console Logging
```typescript
// In useSampleRituals.ts, add:
console.log('[SAMPLE_RITUALS] currentCycle:', currentCycle?.id);
console.log('[SAMPLE_RITUALS] synthesized_output:', JSON.stringify(currentCycle?.synthesized_output));
console.log('[SAMPLE_RITUALS] rituals:', rituals);
console.log('[SAMPLE_RITUALS] isShowingSamples:', isShowingSamples);
```

### Step 3: Test Leave Flow
```typescript
// In CoupleContext.leaveCouple, add:
console.log('[LEAVE] Attempting leave, isPartnerOne:', isPartnerOne);
console.log('[LEAVE] Couple ID:', couple.id);
// After database operation:
console.log('[LEAVE] Database result, error:', error);
```

---

## Next Steps (Per Protocol)

**PHASE 2: Root Cause Investigation**
- [ ] Verify RLS policies for `couples` table DELETE/UPDATE
- [ ] Verify RLS policies for `memory_reactions` table
- [ ] Check actual `synthesized_output` data structure in production
- [ ] Reproduce Memories crash with console open

**PHASE 3: Implementation Plan**
- Pending root cause confirmation
- Will include exact file + line ranges
- Will include checkpoints CP0-CP4

---

## Version
- **Audit Date**: 2025-12-14
- **App Version**: v1.6.4
- **Context Version**: 2024-12-13-v5


