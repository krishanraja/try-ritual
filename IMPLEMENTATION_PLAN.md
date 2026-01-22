# IMPLEMENTATION PLAN: Fix Ritual Selection Glitches
**Date**: 2026-01-22
**Approved Scope**: Option C - Full Implementation (All 3 Phases)
**Estimated Time**: 8-12 hours
**Branch**: `claude/fix-ritual-selection-glitches-A4SRc`

---

## IMPLEMENTATION STRATEGY

### Principles
1. **Incremental Changes**: Each phase builds on the previous
2. **Checkpoint Validation**: Verify functionality after each major change
3. **Backward Compatible**: Maintain existing API surface during refactor
4. **No Breaking Changes**: Users can continue using the app during rollout
5. **Rollback Ready**: Each checkpoint can be independently reverted

### Phases Overview
- **Phase 1**: Error Handling (Foundation) - 2-3 hours → 7 changes
- **Phase 2**: State Sync Architecture (Core) - 4-6 hours → 5 changes  
- **Phase 3**: UX Resilience (Polish) - 2-3 hours → 5 changes

**Total**: 17 file changes across 3 phases

---

## CHECKPOINT PROTOCOL

Each phase follows CP0-CP5 structure:

- **CP0**: Plan approved for this phase
- **CP1**: Environment checks (build, no console errors)
- **CP2**: Core feature implemented and proven
- **CP3**: Secondary integrations validated
- **CP4**: Regression test (full flow 3+ times)
- **CP5**: Phase complete, ready for next phase

Expected outcome and verification method documented for each checkpoint.

---

## PHASE 1: ERROR HANDLING
**Goal**: All errors visible to users within 5 seconds
**Files**: 1 new, 3 modified

### Changes

**1.1** `src/utils/errorHandling.ts` (NEW)
- Central error mapping utility
- Functions: `mapEdgeFunctionError()`, `mapNetworkError()`, `shouldRetry()`, `getRetryDelay()`

**1.2** `src/hooks/useRitualFlow.ts` 
- L750-754: Change from `.catch()` to `await` + `try/catch`
- L432-441: Propagate auto-retry errors to state
- L1041-1045: Handle manual retry errors

**1.3** `src/hooks/useRitualFlow.ts`
- L105-110: Add `autoRetryInProgress` state
- Return interface: Export `autoRetryInProgress`

**1.4** `src/components/ritual-flow/GeneratingPhase.tsx`
- L17-21: Add `autoRetryInProgress` prop
- L26: Expand error condition logic
- L80-103: Show auto-retry UI

**1.5** `src/pages/RitualFlow.tsx`
- L132-139: Pass `autoRetryInProgress` to GeneratingPhase

### Checkpoints

**CP1.0**: Review Phase 1 plan → Approved ✅  
**CP1.1**: Build succeeds, no errors → Verified ✅  
**CP1.2**: Edge function errors propagate → Test: mock failure, see error in UI  
**CP1.3**: Auto-retry status visible → Test: trigger 30s timeout  
**CP1.4**: All error types display → Test: network, server, timeout errors  
**CP1.5**: Full flow with errors works → Test: complete flow with simulated failures  

---

## PHASE 2: STATE SYNC ARCHITECTURE
**Goal**: No spontaneous screen changes
**Files**: 1 new, 2 modified, 2 migrations

### Changes

**2.1** `src/hooks/useSyncEngine.ts` (NEW)
- Realtime-first architecture
- Polling as backup (only when realtime fails)
- Update deduplication + debouncing (500ms)
- Heartbeat detection for realtime health

**2.2** `src/hooks/useRitualFlow.ts`
- L356-400: Remove realtime subscription
- L460-497: Remove synthesis polling
- L528-594: Remove universal sync
- L350: Add `useSyncEngine` integration

**2.3** `supabase/migrations/20260122000000_auto_update_cycle_status.sql` (NEW)
- Database trigger: auto-compute status from inputs
- Eliminates client-side status race conditions

**2.4** `src/hooks/useRitualFlow.ts`
- L725-733: Remove manual status update in `submitInput()`
- L946-949: Remove manual status update in `submitPicks()`

**2.5** `supabase/migrations/20260122000001_auto_update_status_on_picks.sql` (NEW)
- Trigger: recompute status when picks/slots change

### Checkpoints

**CP2.0**: Review Phase 2 plan → Approved ✅  
**CP2.1**: Sync engine works → Test: realtime disconnect, polling activates  
**CP2.2**: useRitualFlow refactored → Test: full flow identical to before  
**CP2.3**: DB triggers deployed → Test: submit input, status auto-updates  
**CP2.4**: Client status removed → Test: status changes correctly  
**CP2.5**: No spontaneous glitches → Test: two-player flow, no screen changes  

---

## PHASE 3: UX RESILIENCE
**Goal**: Graceful degradation, user confidence
**Files**: 3 new, 2 modified

### Changes

**3.1** `src/hooks/useRitualFlow.ts`
- Add interaction lock mechanism
- Prevent phase changes during active user interaction
- Debounce phase computation (500ms)

**3.2** `src/components/NetworkStatus.tsx` (NEW)
- Connection quality indicator
- Shows: offline, degraded, reconnecting states

**3.3** `src/pages/RitualFlow.tsx`
- Add manual sync button to header
- Show last sync time
- Visual feedback on sync

**3.4** `src/components/ErrorBoundary.tsx` (NEW)
- Isolate phase component failures
- Fallback UI on error

**3.5** `src/components/DebugPanel.tsx` (NEW)
- Development diagnostic overlay
- Toggle with Ctrl+Shift+D

### Checkpoints

**CP3.0**: Review Phase 3 plan → Approved ✅  
**CP3.1**: Phase guards work → Test: select ritual, sync, selection preserved  
**CP3.2**: Network status shows → Test: disable network, see offline indicator  
**CP3.3**: Manual sync works → Test: click sync button  
**CP3.4**: Error boundary works → Test: throw error, see fallback  
**CP3.5**: Debug panel functional → Test: Ctrl+Shift+D, inspect state  

---

## TEST SCENARIOS (Final Integration)

1. **Happy Path**: Both partners complete flow without errors
2. **Network Errors**: Offline → submit → error → online → retry → success
3. **Synthesis Timeout**: 45s delay → auto-retry → manual retry
4. **Simultaneous Actions**: Both submit at same time → no race conditions
5. **Page Reload**: Reload during generating → state restored → flow continues
6. **Realtime Failure**: Disable realtime → polling backup → reconnect

**Success Criteria**: All scenarios pass without glitches or data loss

---

## ROLLBACK STRATEGY

**Phase 1**: `git revert <hash>` (no DB changes, safe anytime)  
**Phase 2**: Rollback migrations FIRST, then code (critical order)  
**Phase 3**: `git revert <hash>` (no DB changes, safe anytime)

**Emergency Full Rollback**:
```bash
supabase migration down 2  # Rollback DB first
git revert <phase-3> <phase-2> <phase-1>
git push
```

---

## SUCCESS METRICS

**User Experience**:
- Zero spontaneous screen changes ✅
- All errors visible within 5s ✅
- Synthesis detected within 3s ✅
- No data loss ✅

**Technical**:
- Max 1 state update per user action ✅
- 100% error coverage ✅
- Status always consistent with inputs ✅

**Performance**:
- <3 re-renders per action ✅
- <2 DB queries per state change ✅
- <1s partner sync latency ✅

---

## READY TO BEGIN

**Next Action**: Proceed with Phase 1 implementation

Awaiting your confirmation to start.
