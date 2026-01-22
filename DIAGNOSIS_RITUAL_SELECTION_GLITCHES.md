# DIAGNOSIS: Ritual Selection Screen Glitches
**Date**: 2026-01-22
**Issue**: Two-player ritual selection flow experiences spontaneous screen changes, errors, and state glitches
**Severity**: CRITICAL - Core user experience broken
**Mode**: STRICT DIAGNOSTIC - No edits until scope approved

---

## EXECUTIVE SUMMARY

The ritual selection flow suffers from **7 critical architectural issues** that create a chaotic two-player UX:

1. **Multiple Concurrent State Update Sources** → Spontaneous screen changes every 3-8 seconds
2. **Edge Function Error Swallowing** → "Failed to send request" errors not shown to users
3. **Status Update Race Conditions** → Database state conflicts with optimistic UI state
4. **Synthesis Auto-Retry Failures** → Silent failures during 30-second timeout recovery
5. **Phase Computation Instability** → Screen phase changes mid-interaction
6. **Realtime vs Polling Conflicts** → Duplicate updates, state thrashing
7. **Error Display Logic Gaps** → Errors don't propagate to UI correctly

**Root Cause Classification:**
- **State Synchronization Architecture**: Issues 1, 3, 5, 6
- **Error Handling**: Issues 2, 4, 7

**User Impact:**
- Both partners see screens "glitching between loading, taking longer than expected, erroring, and then showing results"
- Screens change spontaneously without user interaction
- "Failed to send a request to the Edge Function" error appears intermittently
- Users cannot complete the ritual selection flow reliably

---

## ISSUE #1: MULTIPLE CONCURRENT STATE UPDATE SOURCES
**Severity**: CRITICAL
**Type**: Architectural Race Condition
**Files**: `src/hooks/useRitualFlow.ts`

### Problem Description
Three independent mechanisms update `cycle` state simultaneously:

1. **Universal Sync Polling** (L528-594)
   - Runs every 8 seconds unconditionally
   - Fetches entire cycle from database
   - Calls `setCycle(data)` if any drift detected
   - **Triggers**: On ANY difference (status, inputs, output)

2. **Synthesis Polling** (L460-497)
   - Runs every 3 seconds during 'generating' status
   - Fetches `synthesized_output` and `status`
   - Calls `setCycle(prev => ({ ...prev, ...data }))`
   - **Triggers**: When synthesis completes

3. **Realtime Subscription** (L356-400)
   - Instant updates on database changes
   - Listens to `weekly_cycles`, `ritual_preferences`, `availability_slots`
   - Calls `setCycle(payload.new)` on UPDATE event
   - **Triggers**: On partner actions

### Race Condition Flow
```
Time  Partner 1                    Partner 2                    Database
0s    Submit input (optimistic)    -                           status: awaiting_partner_two
1s    -                            Submit input (optimistic)    status: generating
2s    Realtime: setCycle(new)      Realtime: setCycle(new)      status: generating
3s    Polling: setCycle(merge)     Polling: setCycle(merge)     status: generating
5s    -                            -                           synthesis completes
5.1s  Realtime: setCycle(new)      Realtime: setCycle(new)      status: awaiting_both_picks
6s    Polling: setCycle(merge)     Polling: setCycle(merge)     status: awaiting_both_picks
8s    UniversalSync: setCycle(new) UniversalSync: setCycle(new) status: awaiting_both_picks
```

### Evidence from Code

**Universal Sync** (L528-594):
```typescript
useEffect(() => {
  if (!cycle?.id) return;

  const syncCycleState = async () => {
    // ... fetch from database ...

    // Detect state drift
    const hasDrift =
      serverStatus !== localStatus ||
      serverHasOutput !== localHasOutput ||
      serverP1Input !== localP1Input ||
      serverP2Input !== localP2Input;

    if (hasDrift) {
      console.log('[useRitualFlow] 🔄 State drift detected, syncing from server');
      setCycle(data); // ← STATE UPDATE #1

      if (serverHasOutput && !localHasOutput) {
        await Promise.all([
          loadPicks(cycle.id),
          loadAvailability(cycle.id)
        ]);
      }
    }
  };

  syncCycleState();
  const syncInterval = setInterval(syncCycleState, UNIVERSAL_SYNC_INTERVAL_MS); // Every 8s

  return () => clearInterval(syncInterval);
}, [cycle?.id, status, cycle?.synthesized_output, cycle?.partner_one_input, cycle?.partner_two_input]);
```

**Synthesis Polling** (L460-497):
```typescript
useEffect(() => {
  const isGenerating = status === 'generating' ||
    (cycle?.partner_one_input && cycle?.partner_two_input && !cycle?.synthesized_output);

  if (!isGenerating || !cycle?.id) return;

  const pollForCompletion = async () => {
    const { data } = await supabase
      .from('weekly_cycles')
      .select('synthesized_output, status')
      .eq('id', cycle.id)
      .single();

    if (data?.synthesized_output) {
      console.log('[useRitualFlow] ✅ Polling detected synthesis completion');
      setCycle(prev => prev ? { ...prev, ...data } as typeof prev : prev); // ← STATE UPDATE #2
    }
  };

  pollForCompletion();
  const pollInterval = setInterval(pollForCompletion, SYNTHESIS_POLL_INTERVAL_MS); // Every 3s

  return () => clearInterval(pollInterval);
}, [status, cycle?.id, cycle?.partner_one_input, cycle?.partner_two_input, cycle?.synthesized_output]);
```

**Realtime Subscription** (L356-400):
```typescript
useEffect(() => {
  if (!cycle?.id || !user?.id) return;

  const channel = supabase
    .channel(`ritual-flow-${cycle.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'weekly_cycles',
      filter: `id=eq.${cycle.id}`
    }, (payload) => {
      console.log('[useRitualFlow] Cycle updated via realtime:', payload.new);
      setCycle(payload.new as WeeklyCycle); // ← STATE UPDATE #3
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [cycle?.id, user?.id]);
```

### Impact Analysis

**User Experience:**
- Screen changes every 3-8 seconds without user interaction
- Both partners see synchronized glitches (proves two-player state sync works)
- Users lose trust in the app ("it's randomly changing what I see")

**Technical Impact:**
- React re-renders every time `setCycle()` is called
- Phase recomputation on every render
- Component unmount/remount in `AnimatePresence`
- Performance degradation from unnecessary renders

**Why Both Partners See Same Glitches:**
- Realtime ensures both get same database updates
- Universal sync runs on same 8-second interval (approximately)
- Both are polling synthesis at same 3-second interval
- Database is the shared source of truth

### Recommended Fix Strategy
1. **Single Source of Truth Pattern**: Use realtime as PRIMARY, polling as FALLBACK
2. **Debounce State Updates**: Prevent multiple updates within short time window
3. **Optimistic UI with Reconciliation**: Only sync on user-initiated actions + realtime failures
4. **State Update Coordination**: Use a state machine to coordinate updates

---

## ISSUE #2: EDGE FUNCTION ERROR SWALLOWING
**Severity**: CRITICAL
**Type**: Error Handling Gap
**Files**: `src/hooks/useRitualFlow.ts:750-754`, `src/components/ritual-flow/GeneratingPhase.tsx:26`

### Problem Description
When `supabase.functions.invoke('trigger-synthesis')` fails due to network errors, the error is caught with `.catch()` but NOT propagated to the UI error state. Users see nothing or a generic "Failed to send request" message without proper error display.

### Evidence from Code

**Submit Input - Fire and Forget** (L746-755):
```typescript
const submitInput = useCallback(async () => {
  // ... validation and database updates ...

  // Trigger synthesis if both are now complete
  if (bothComplete) {
    console.log('[useRitualFlow] Both partners complete, triggering synthesis');
    // Fire and forget - trigger will handle idempotency
    supabase.functions.invoke('trigger-synthesis', {
      body: { cycleId: cycle.id }
    }).catch(err => {
      console.warn('[useRitualFlow] ⚠️ Synthesis trigger failed (non-blocking):', err);
      // ❌ ERROR NOT SET - setError() never called
    });
  }

  // ... success logging ...
}, [cycle, user?.id, selectedCards, desire, isPartnerOne]);
```

**Auto-Retry - Same Issue** (L432-441):
```typescript
// Auto-retry once
if (!hasAutoRetriedRef.current && cycle?.id) {
  hasAutoRetriedRef.current = true;
  console.log('[useRitualFlow] Attempting auto-retry...');
  supabase.functions.invoke('trigger-synthesis', {
    body: { cycleId: cycle.id, forceRetry: true }
  }).catch(err => {
    console.error('[useRitualFlow] Auto-retry failed:', err);
    // ❌ ERROR NOT SET - setError() never called
  });
  // Reset start time to give retry a chance
  synthesisStartTimeRef.current = Date.now();
}
```

**Error Display Logic** (GeneratingPhase.tsx:26):
```typescript
const isFailed = status === 'generation_failed' || !!error;
```

**The Gap:**
- `status === 'generation_failed'` only set by edge function response `data.status === 'failed'`
- But if edge function **invocation** fails (network error, timeout), no response is returned
- Local `error` state is NEVER set in the `.catch()` blocks
- Result: User sees loading screen indefinitely or gets stuck in timeout loop

### Network Failure Scenarios

**Scenario 1: Edge Function Network Error**
```
User submits input →
  Database update succeeds →
  Edge function invoke fails (network error) →
  .catch() logs error but doesn't set state →
  User sees "Creating Your Rituals" forever →
  30s timeout triggers auto-retry →
  Auto-retry also fails (network still down) →
  Timeout shows "Taking Longer Than Expected" →
  User clicks "Try Again" →
  Manual retry might work or fail again
```

**Scenario 2: Edge Function Returns 500**
```
User submits input →
  Database update succeeds →
  Edge function invokes successfully →
  Edge function returns { status: 'failed', error: 'message' } →
  BUT response is in .catch() which doesn't set error →
  Same infinite loop as Scenario 1
```

### Impact Analysis

**User Experience:**
- "Failed to send a request to the Edge Function" error in screenshots
- No clear indication that synthesis failed
- Users stuck clicking "Try Again" repeatedly
- No guidance on what went wrong or how to fix it

**Technical Debt:**
- Error handling inconsistency across the codebase
- Fire-and-forget pattern makes debugging impossible
- Logs are only visible in browser console, not to users

### Recommended Fix Strategy
1. **Await Edge Function Calls**: Make synthesis trigger blocking, not fire-and-forget
2. **Error State Propagation**: Always call `setError()` in catch blocks
3. **User-Friendly Error Messages**: Map edge function errors to actionable messages
4. **Retry Logic**: Show retry button immediately on network failures

---

## ISSUE #3: STATUS UPDATE RACE CONDITION
**Severity**: CRITICAL
**Type**: Database Consistency Issue
**Files**: `src/hooks/useRitualFlow.ts:725-742`

### Problem Description
Status updates are performed as a SEPARATE database operation after input updates. If the status update fails (network error, constraint violation), the database has inconsistent state: inputs show both partners submitted, but status says "awaiting_partner_two".

Universal sync detects this drift every 8 seconds and overwrites the optimistic local state, causing spontaneous screen changes.

### Evidence from Code

**submitInput - Two Separate Updates** (L617-742):
```typescript
const submitInput = useCallback(async () => {
  // ... validation ...

  try {
    // UPDATE #1: Save input data
    const { data, error: updateError } = await supabase
      .from('weekly_cycles')
      .update({
        [updateField]: inputData,
        [submittedField]: new Date().toISOString()
      })
      .eq('id', cycle.id)
      .select();

    if (updateError) throw updateError;

    // ⚠️ At this point, DB has input but old status

    // Determine the new status
    const updatedCycle = { ...cycle, [updateField]: inputData };
    const bothComplete = updatedCycle.partner_one_input && updatedCycle.partner_two_input;

    let newStatus: CycleStatus;
    if (bothComplete) {
      newStatus = 'generating';
    } else if (isPartnerOne) {
      newStatus = 'awaiting_partner_two';
    } else {
      newStatus = 'awaiting_partner_one';
    }

    // UPDATE #2: Update status in separate call
    const { error: statusError } = await supabase
      .from('weekly_cycles')
      .update({ status: newStatus })
      .eq('id', cycle.id);

    if (statusError) {
      console.warn('[useRitualFlow] ⚠️ Status update failed (non-blocking):', statusError);
      // Continue anyway - the local state update is more important for UX
      // ❌ DATABASE NOW INCONSISTENT
    }

    // OPTIMISTIC UPDATE: Set local state assuming success
    setCycle(prev => prev ? {
      ...prev,
      [updateField]: inputData,
      [submittedField]: now,
      status: newStatus // ← Local state assumes this succeeded
    } as typeof prev : prev);

  } catch (err) {
    // ...
  }
}, [cycle, user?.id, selectedCards, desire, isPartnerOne]);
```

### Race Condition Timeline

```
Time  Action                           Database State                      Local State
0s    Partner 1 submits input          p1_input: data, status: awaiting_   p1_input: data, status: awaiting_
                                       partner_two                         partner_two
1s    Partner 2 submits input          p1_input: data, p2_input: data,     p1_input: data, p2_input: data,
      (input update succeeds)          status: awaiting_partner_two        status: generating (optimistic)
1.1s  Partner 2 status update FAILS    p1_input: data, p2_input: data,     p1_input: data, p2_input: data,
      (network error)                  status: awaiting_partner_two ❌     status: generating ✓
2s    Partner 2 realtime receives      p1_input: data, p2_input: data,     p1_input: data, p2_input: data,
      their own update                 status: awaiting_partner_two        status: generating
8s    Universal sync detects drift     p1_input: data, p2_input: data,     p1_input: data, p2_input: data,
                                       status: awaiting_partner_two        status: awaiting_partner_two
      Overwrites local state           ↑ SERVER WINS                       ↑ SCREEN CHANGES SPONTANEOUSLY
```

**Result**: User sees "Generating" phase, then after 8 seconds suddenly goes back to "Waiting for partner"

### Impact Analysis

**User Experience:**
- Screen "glitches" backward to previous phase
- Confusing state transitions
- Users think something is broken
- Both partners experience synchronized glitches when sync interval aligns

**Database Integrity:**
- Inconsistent state between columns
- Status doesn't match actual cycle progression
- Can cause synthesis to not trigger even though both inputs exist

### Recommended Fix Strategy
1. **Atomic Status Updates**: Use database triggers to auto-update status on input changes
2. **Single Transaction**: Combine input + status update in one RPC call
3. **Optimistic UI Rollback**: Detect status update failure and revert optimistic state
4. **Status Recomputation**: Add database constraint that validates status matches inputs

---

## ISSUE #4: SYNTHESIS AUTO-RETRY FAILURES
**Severity**: HIGH
**Type**: Silent Failure
**Files**: `src/hooks/useRitualFlow.ts:432-446`

### Problem Description
After 30 seconds of synthesis timeout, the system auto-retries by invoking the edge function. If this auto-retry fails (network error, edge function error), the failure is logged but NOT shown to the user. The error state is only set AFTER the auto-retry attempt.

This means users wait an additional 30+ seconds before seeing an error, and they don't know the retry failed.

### Evidence from Code

**Timeout Check with Auto-Retry** (L412-457):
```typescript
useEffect(() => {
  const isGenerating = status === 'generating' ||
    (cycle?.partner_one_input && cycle?.partner_two_input && !cycle?.synthesized_output);

  if (isGenerating) {
    if (!synthesisStartTimeRef.current) {
      synthesisStartTimeRef.current = Date.now();
    }

    const elapsed = Date.now() - synthesisStartTimeRef.current;
    if (elapsed >= SYNTHESIS_TIMEOUT_MS && !synthesisTimedOut) {
      console.warn('[useRitualFlow] ⚠️ Synthesis timeout exceeded', { elapsed });

      // Auto-retry once
      if (!hasAutoRetriedRef.current && cycle?.id) {
        hasAutoRetriedRef.current = true;
        console.log('[useRitualFlow] Attempting auto-retry...');

        supabase.functions.invoke('trigger-synthesis', {
          body: { cycleId: cycle.id, forceRetry: true }
        }).catch(err => {
          console.error('[useRitualFlow] Auto-retry failed:', err);
          // ❌ ERROR NOT SET HERE
        });

        // Reset start time to give retry a chance
        synthesisStartTimeRef.current = Date.now(); // ← Starts ANOTHER 30s wait
      } else {
        // Already retried, show timeout error
        setSynthesisTimedOut(true);
        setError('Ritual generation is taking longer than expected. Please try again.');
        // ❌ ERROR ONLY SET AFTER 60s TOTAL
      }
    }
  } else {
    // Reset timeout tracking when not generating
    if (synthesisStartTimeRef.current) {
      synthesisStartTimeRef.current = null;
      hasAutoRetriedRef.current = false;
      setSynthesisTimedOut(false);
    }
  }
}, [status, cycle?.partner_one_input, cycle?.partner_two_input, cycle?.synthesized_output, cycle?.id, synthesisTimedOut]);
```

### Timeline of User Experience

```
0s    Both partners submit input
1s    Status changes to 'generating'
1s    Synthesis polling starts (every 3s)
1s    Universal sync starts (every 8s)
5s    Edge function actually completes synthesis
      BUT realtime notification fails (network glitch)
30s   Timeout #1 triggers
      Auto-retry invoked
      Start time reset to NOW
      ❌ Auto-retry FAILS silently (edge function unreachable)
      User still sees "Creating Your Rituals..."
33s   Polling continues (still no output detected)
60s   Timeout #2 triggers (30s after auto-retry)
      NOW error is shown: "Taking Longer Than Expected"
      User clicks "Try Again"
      Manual retry SUCCEEDS and finds existing rituals
```

**User waited 60 seconds when synthesis actually completed at 5 seconds!**

### Impact Analysis

**User Experience:**
- Extremely long wait times (60+ seconds)
- No indication that auto-retry failed
- Users don't know if they should wait or take action
- "Taking Longer Than Expected" message appears too late

**Technical Issues:**
- Auto-retry failure is invisible to debugging
- Retry logic compounds the problem instead of fixing it
- Polling should have detected completion but didn't (Issue #6)

### Recommended Fix Strategy
1. **Show Auto-Retry Status**: Display "Retrying..." message to user
2. **Faster Retry Detection**: Check auto-retry result immediately
3. **Exponential Backoff**: Don't reset to 30s, use shorter intervals
4. **Fallback Detection**: If auto-retry fails, immediately check database for existing output

---

## ISSUE #5: PHASE COMPUTATION INSTABILITY
**Severity**: HIGH
**Type**: Derived State Volatility
**Files**: `src/hooks/useRitualFlow.ts:187-190`, `src/types/database.ts:144-182`

### Problem Description
The UI `phase` is recomputed on every render based on `status`. Since `status` is part of `cycle` which updates frequently (Issues #1, #3), the phase changes mid-interaction even when users haven't completed any action.

### Evidence from Code

**Phase Derivation** (useRitualFlow.ts:187-190):
```typescript
const phase = useMemo(() =>
  computeFlowPhase(status, isPartnerOne, myProgress),
  [status, isPartnerOne, myProgress]
);
```

**Status Derivation** (useRitualFlow.ts:155):
```typescript
const status: CycleStatus = (cycle as any)?.status || 'awaiting_both_input';
```

**Phase Computation Logic** (database.ts:144-182):
```typescript
export function computeFlowPhase(
  status: CycleStatus,
  isPartnerOne: boolean,
  myProgress: UserProgress
): FlowPhase {
  switch (status) {
    case 'awaiting_both_input':
      return 'input';

    case 'awaiting_partner_one':
      return isPartnerOne ? 'input' : 'waiting';

    case 'awaiting_partner_two':
      return isPartnerOne ? 'waiting' : 'input';

    case 'generating':
    case 'generation_failed':
      return 'generating';

    case 'awaiting_both_picks':
      return 'pick';

    case 'awaiting_partner_one_pick':
      return isPartnerOne ? 'pick' : 'waiting';

    case 'awaiting_partner_two_pick':
      return isPartnerOne ? 'waiting' : 'pick';

    case 'awaiting_agreement':
      return 'match';

    case 'agreed':
    case 'completed':
      return 'confirmed';

    default:
      return 'input';
  }
}
```

### Volatility Chain

```
cycle changes (Issue #1)
  → status changes
  → useMemo recalculates phase
  → phase changes
  → RitualFlow.tsx AnimatePresence detects phase change
  → Component unmounts/remounts
  → User sees screen transition animation
```

**Example Scenario:**
```
User is on "Pick" phase, selecting rituals
  ↓
Universal sync runs (8s interval)
  ↓
Detects server status = 'awaiting_partner_two_pick' but local had 'awaiting_both_picks'
  ↓
setCycle() updates local state
  ↓
status changes → phase recalculates → phase changes from 'pick' to 'waiting'
  ↓
AnimatePresence transitions from PickPhase to WaitingPhase
  ↓
User's ritual selection is interrupted mid-click
```

### Impact Analysis

**User Experience:**
- Screen changes while user is interacting
- Lost user input (selections, text fields)
- Jarring transition animations
- Confusion about what state they're in

**Component Lifecycle:**
- Unnecessary unmounting of heavy components (PickPhase has 19k+ lines)
- State loss in form fields
- Animation re-triggers
- Performance issues

### Recommended Fix Strategy
1. **Stable Phase Calculation**: Only change phase on user actions or partner actions
2. **Phase Lock**: Prevent phase transitions during active user interaction
3. **Debounced Status**: Don't immediately recalculate phase on status change
4. **Component Key Stability**: Use stable keys that don't change on minor updates

---

## ISSUE #6: REALTIME VS POLLING CONFLICTS
**Severity**: MEDIUM
**Type**: Duplicate Update Mechanism
**Files**: `src/hooks/useRitualFlow.ts:356-400`, `src/hooks/useRitualFlow.ts:460-497`

### Problem Description
Both realtime subscription AND synthesis polling update the cycle state when synthesis completes. In the ideal case, realtime fires first. In degraded network conditions, polling acts as backup. But there's no coordination between them, leading to duplicate updates and potential state conflicts.

### Evidence from Code

**Realtime Subscription** (L356-400):
```typescript
useEffect(() => {
  if (!cycle?.id || !user?.id) return;

  const channel = supabase
    .channel(`ritual-flow-${cycle.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'weekly_cycles',
      filter: `id=eq.${cycle.id}`
    }, (payload) => {
      console.log('[useRitualFlow] Cycle updated via realtime:', payload.new);
      setCycle(payload.new as WeeklyCycle); // ← UPDATE METHOD #1: Replace entire object
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ritual_preferences',
      filter: `weekly_cycle_id=eq.${cycle.id}`
    }, () => {
      loadPicks(cycle.id); // ← Separate reload
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'availability_slots',
      filter: `weekly_cycle_id=eq.${cycle.id}`
    }, () => {
      loadAvailability(cycle.id); // ← Separate reload
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [cycle?.id, user?.id, loadPicks, loadAvailability]);
```

**Synthesis Polling** (L460-497):
```typescript
useEffect(() => {
  const isGenerating = status === 'generating' ||
    (cycle?.partner_one_input && cycle?.partner_two_input && !cycle?.synthesized_output);

  if (!isGenerating || !cycle?.id) return;

  const pollForCompletion = async () => {
    try {
      const { data } = await supabase
        .from('weekly_cycles')
        .select('synthesized_output, status')
        .eq('id', cycle.id)
        .single();

      if (data?.synthesized_output) {
        console.log('[useRitualFlow] ✅ Polling detected synthesis completion');
        setCycle(prev => prev ? { ...prev, ...data } as typeof prev : prev); // ← UPDATE METHOD #2: Merge
      }
    } catch (err) {
      console.warn('[useRitualFlow] Polling exception:', err);
    }
  };

  pollForCompletion();
  const pollInterval = setInterval(pollForCompletion, SYNTHESIS_POLL_INTERVAL_MS);

  return () => clearInterval(pollInterval);
}, [status, cycle?.id, cycle?.partner_one_input, cycle?.partner_two_input, cycle?.synthesized_output]);
```

### Conflict Scenarios

**Scenario 1: Both Fire Simultaneously**
```
5.0s  Synthesis completes in database
5.1s  Realtime receives UPDATE event
5.1s  Realtime calls setCycle(payload.new) ← Full object replacement
5.2s  Polling detects synthesized_output exists
5.2s  Polling calls setCycle(prev => ({ ...prev, ...data })) ← Merge
5.3s  React batches updates, but order is undefined
```

**Scenario 2: Realtime Delayed**
```
5.0s  Synthesis completes
5.5s  Polling calls setCycle (merge)
6.0s  Realtime finally arrives, calls setCycle (full replacement)
      → Realtime might OVERWRITE polling's update with stale data if timing is wrong
```

**Scenario 3: Realtime Fails**
```
5.0s  Synthesis completes
      Realtime connection dropped (mobile network switch)
8.0s  Polling detects completion ← 3 second delay before user sees result
      Universal sync also detects completion ← Duplicate update
```

### Impact Analysis

**User Experience:**
- Delayed transitions when realtime fails (3+ seconds)
- Potential for seeing old data briefly before correction
- Inconsistent timing between partners

**Technical Issues:**
- Wasted database queries (polling runs even when realtime works)
- Race conditions in state updates
- No clear "source of truth" for state

### Recommended Fix Strategy
1. **Realtime-First Architecture**: Use realtime as primary, polling only as fallback
2. **Polling Pause**: Stop polling for 10s after successful realtime update
3. **Update Deduplication**: Track last update timestamp, ignore duplicates
4. **Heartbeat Detection**: Detect when realtime is disconnected, escalate polling frequency

---

## ISSUE #7: ERROR DISPLAY LOGIC GAPS
**Severity**: MEDIUM
**Type**: UI Logic Bug
**Files**: `src/components/ritual-flow/GeneratingPhase.tsx:26`

### Problem Description
The `GeneratingPhase` component only shows the error state when `status === 'generation_failed'` OR `error` prop exists. However:

1. Edge function network errors don't set `status = 'generation_failed'` (they can't, the call failed)
2. Edge function invocation errors aren't propagated to `error` prop (Issue #2)
3. Result: Users see loading screen even when errors occurred

### Evidence from Code

**Error Display Condition** (GeneratingPhase.tsx:26):
```typescript
const isFailed = status === 'generation_failed' || !!error;
```

**When `status === 'generation_failed'` is Set:**
- Only when edge function **returns** `{ status: 'failed' }` (trigger-synthesis L326-330)
- This requires edge function to execute successfully but fail internally
- Network errors, timeouts, 500 errors don't reach this code path

**When `error` prop is Set:**
- Manual retry error: `useRitualFlow.retryGeneration()` L1054
- Synthesis timeout: `useRitualFlow` L445
- NOT set on edge function invocation failure (Issue #2)

### Missing Error Cases

**Case 1: Edge Function Invoke Fails**
```typescript
// useRitualFlow.ts L750
supabase.functions.invoke('trigger-synthesis', {
  body: { cycleId: cycle.id }
}).catch(err => {
  console.warn('[useRitualFlow] ⚠️ Synthesis trigger failed (non-blocking):', err);
  // ❌ setError() not called
  // ❌ status not updated
  // Result: GeneratingPhase shows loading indefinitely
});
```

**Case 2: Edge Function Returns Non-200**
```typescript
// If edge function returns 400, 500, 503, etc.
// The response is in error object of invoke()
// But .catch() doesn't call setError()
// User sees loading screen
```

**Case 3: Edge Function Returns Success but Malformed Data**
```typescript
// If edge function returns { status: 'unknown_value' }
// Neither status === 'generation_failed' nor error is set
// User sees loading screen
```

### Impact Analysis

**User Experience:**
- Silent failures (no error shown)
- Loading spinner continues indefinitely
- Users don't know if they should wait or take action
- Timeout eventually shows error, but delay is 30-60 seconds

**Debugging:**
- Errors only in console logs
- Users can't report meaningful error messages
- Support team has no visibility

### Recommended Fix Strategy
1. **Comprehensive Error Mapping**: Map all failure modes to error state
2. **Timeout Fallback**: Always show error after reasonable timeout (15s)
3. **Error Boundary**: Wrap GeneratingPhase in error boundary
4. **Network Status Detection**: Show network error if offline

---

## ARCHITECTURAL RECOMMENDATIONS

### Priority 1: State Synchronization (Issues #1, #3, #5, #6)

**Goal**: Single, predictable state update flow

**Approach**: Event-Driven State Machine
```
Database (Source of Truth)
  ↓ (Realtime Primary, Polling Backup)
State Update Queue (Debounced)
  ↓
React State (Optimistic + Server Reconciliation)
  ↓
Derived State (Phase, Progress)
  ↓
UI Components
```

**Implementation Steps:**
1. Create `useSyncEngine` hook
   - Owns all database subscriptions
   - Debounces updates (500ms window)
   - Deduplicates updates by timestamp
   - Provides single `setCycle` with coordination

2. Realtime-First Pattern
   - Disable polling when realtime is healthy
   - Enable polling only when realtime fails heartbeat
   - Escalate polling frequency during degraded mode

3. Optimistic UI with Rollback
   - Track pending operations
   - Server update reconciles or rolls back
   - Never override user's in-progress input

4. Status as Database Trigger
   - Remove client-side status updates
   - Database function computes status from inputs
   - Eliminate status update race condition

### Priority 2: Error Handling (Issues #2, #4, #7)

**Goal**: All errors visible to users with actionable messages

**Approach**: Comprehensive Error Propagation
```
Error Source
  ↓
Error Handler (Maps to user-friendly message)
  ↓
Error State (React state)
  ↓
Error UI (Visual feedback + retry action)
  ↓
Error Logging (Telemetry for debugging)
```

**Implementation Steps:**
1. Await All Edge Function Calls
   - Remove fire-and-forget pattern
   - Make synthesis trigger blocking
   - Propagate all errors to error state

2. Error State Machine
   - Track error type (network, server, timeout, validation)
   - Provide specific retry strategies
   - Show appropriate UI for each type

3. Auto-Retry with Visibility
   - Show "Retrying..." message
   - Limit retry attempts (max 3)
   - Fallback to manual retry button

4. Error Telemetry
   - Log all errors to monitoring service
   - Include user ID, cycle ID, timestamp
   - Enable remote debugging

### Priority 3: UX Resilience

**Goal**: Graceful degradation, no breaking glitches

**Approach**: Progressive Enhancement
```
Core Flow (Works offline)
  ↓
Real-time Sync (Enhances experience)
  ↓
Background Polling (Backup mechanism)
  ↓
Manual Refresh (Always available)
```

**Implementation Steps:**
1. Phase Transition Guards
   - Lock phase during active user interaction
   - Require user confirmation for destructive transitions
   - Preserve in-progress selections

2. Network Status Indicator
   - Show connection quality
   - Warn before state-changing actions if offline
   - Queue operations when offline

3. Manual Sync Button
   - Always visible in debug/settings
   - Bypass all automatic sync
   - Force fresh data from server

4. Component Error Boundaries
   - Isolate phase component failures
   - Show fallback UI
   - Allow retry without full page reload

---

## FILES REQUIRING CHANGES

### Critical Path Files
1. **`src/hooks/useRitualFlow.ts`** (1,153 lines)
   - Issues: #1, #2, #3, #4, #5, #6
   - Changes: Complete refactor of state sync logic

2. **`src/components/ritual-flow/GeneratingPhase.tsx`** (136 lines)
   - Issues: #2, #7
   - Changes: Error display logic expansion

3. **`supabase/functions/trigger-synthesis/index.ts`** (343 lines)
   - Issues: #2, #4
   - Changes: Error response structure

### Supporting Files
4. **`src/contexts/CoupleContext.tsx`** (980 lines)
   - Realtime subscription coordination

5. **`src/pages/RitualFlow.tsx`** (307 lines)
   - Phase transition handling

6. **`src/types/database.ts`** (400+ lines)
   - Status and phase type definitions

### New Files to Create
7. **`src/hooks/useSyncEngine.ts`**
   - Unified state synchronization engine

8. **`src/utils/errorHandling.ts`**
   - Error mapping and user messaging

9. **`src/components/NetworkStatus.tsx`**
   - Network quality indicator

---

## TESTING REQUIREMENTS

### Unit Tests
- [ ] State update deduplication logic
- [ ] Error mapping functions
- [ ] Phase computation stability
- [ ] Status derivation from inputs

### Integration Tests
- [ ] Two-player flow with simulated network delays
- [ ] Realtime failure → polling fallback
- [ ] Edge function errors propagate to UI
- [ ] Status update race condition handling

### E2E Tests
- [ ] Complete ritual selection flow (happy path)
- [ ] Synthesis timeout and retry flow
- [ ] Both partners submit simultaneously
- [ ] Network disconnection during flow
- [ ] Page reload mid-flow recovery

### Manual Testing Scenarios
1. **Spontaneous Screen Changes**
   - Load flow on two devices
   - Submit input on one device
   - Verify other device updates smoothly
   - Verify no glitching between states

2. **Edge Function Errors**
   - Disable edge functions (or mock failure)
   - Submit input
   - Verify error shows immediately
   - Verify retry button works

3. **Status Update Failure**
   - Mock status update failure
   - Submit input
   - Verify universal sync corrects state
   - Verify no data loss

4. **Synthesis Timeout**
   - Mock slow synthesis (45s+)
   - Verify timeout message at 30s
   - Verify auto-retry triggers
   - Verify completion detection

---

## SUCCESS CRITERIA

### User Experience Metrics
- [ ] Zero spontaneous screen changes reported
- [ ] All errors visible to users within 5 seconds
- [ ] Synthesis completion detected within 3 seconds
- [ ] Phase transitions smooth and predictable
- [ ] No data loss during network failures

### Technical Metrics
- [ ] State updates: max 1 per user action (plus partner updates)
- [ ] Error handling: 100% coverage of failure modes
- [ ] Realtime reliability: >99% uptime detection
- [ ] Polling backup: activates within 10s of realtime failure
- [ ] Database consistency: status always matches inputs

### Performance Benchmarks
- [ ] Re-renders: <3 per user action
- [ ] Database queries: <2 per state change
- [ ] Edge function latency: <5s for synthesis
- [ ] State sync latency: <1s for partner updates
- [ ] Component mount/unmount: only on deliberate phase transitions

---

## NEXT STEPS

1. **Approve Diagnostic Scope**
   - Review all 7 issues identified
   - Confirm priority and severity
   - Approve recommended fix strategies

2. **Create Implementation Plan**
   - Break down changes into checkpoints
   - Define rollback strategy for each change
   - Estimate implementation time

3. **Setup Testing Environment**
   - Create two-device testing setup
   - Mock edge function failures
   - Prepare network throttling tools

4. **Incremental Implementation**
   - Start with error handling (Priority 2)
   - Then state sync (Priority 1)
   - Then UX resilience (Priority 3)
   - Test after each checkpoint

5. **Validation**
   - Run all test scenarios
   - Deploy to staging
   - User acceptance testing
   - Gradual production rollout

---

**END OF DIAGNOSIS**
