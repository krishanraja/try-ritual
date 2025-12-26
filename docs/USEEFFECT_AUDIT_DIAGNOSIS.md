# useEffect Audit Diagnosis

**Date:** 2025-12-26
**Scope:** All 45 files containing useEffect hooks
**Bug Pattern:** State variables in dependency arrays that are also modified by the effect, causing loops or unwanted re-triggers

---

## Executive Summary

Found **7 HIGH priority bugs**, **5 MEDIUM priority issues**, and **12 LOW priority code smells** across the codebase. The same anti-pattern appears repeatedly: effects that both read from and write to state variables in their dependency arrays.

---

## CRITICAL BUGS (HIGH Priority)

### 1. PickPhase.tsx - Auto-transition loop trap

**File:** `src/components/ritual-flow/PickPhase.tsx`
**Lines:** 73-83

```typescript
useEffect(() => {
  if (hasAllPicks && activeSection === 'rituals') {
    const timer = setTimeout(() => {
      setActiveSection('availability');  // <-- MODIFIES activeSection
    }, 300);
    return () => clearTimeout(timer);
  }
}, [hasAllPicks, activeSection]);  // <-- activeSection IN DEPS
```

**Problem:** When user manually clicks to return to rituals section after completing picks, the effect immediately triggers again (because `activeSection` changed to 'rituals'), auto-transitioning them back to availability after 300ms. Users cannot review their ritual selections.

**Root Cause:** Circular dependency - effect reacts to `activeSection` change but also modifies it.

**Fix Options:**
1. Remove `activeSection` from deps, use a ref to track if auto-transition already happened
2. Add a flag `hasManuallyNavigated` that disables auto-transition
3. Only auto-transition once using a ref: `const hasAutoTransitioned = useRef(false)`

---

### 2. SynthesisAnimation.tsx - Timeout effect circular dependency

**File:** `src/components/SynthesisAnimation.tsx`
**Lines:** 192-213

```typescript
// Effect 1
useEffect(() => {
  const timer = setTimeout(() => {
    if (!isComplete && !hasError) {
      setShowRefreshButton(true);
    }
  }, SHOW_REFRESH_AFTER);
  return () => clearTimeout(timer);
}, [isComplete, hasError]);  // <-- Reacts to hasError

// Effect 2
useEffect(() => {
  const timer = setTimeout(() => {
    if (!isComplete && !hasError) {
      setHasError(true);  // <-- MODIFIES hasError
    }
  }, MAX_WAIT_TIME);
  return () => clearTimeout(timer);
}, [isComplete, hasError]);  // <-- hasError IN DEPS
```

**Problem:** When Effect 2 sets `hasError(true)`, it triggers Effect 1 to re-run (hasError changed). While Effect 1 has guards, this is still wasteful and could cause subtle timing issues.

**Fix:** Remove `hasError` from Effect 2's deps since the effect only needs to run once on mount. Use `[]` deps with refs for state checks.

---

### 3. use-toast.ts - Listener array mutation in effect

**File:** `src/hooks/use-toast.ts`
**Lines:** 169-177

```typescript
React.useEffect(() => {
  listeners.push(setState);  // <-- MUTATES external array
  return () => {
    const index = listeners.indexOf(setState);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}, [state]);  // <-- state IN DEPS, but setState identity changes
```

**Problem:** `state` in deps causes effect to re-run on every state change. The cleanup removes and re-adds the listener repeatedly.

**Fix:** Use `[]` for deps since we only need to register listener once on mount.

---

### 4. SplashScreen.tsx - Fallback timeout with state in deps

**File:** `src/components/SplashScreen.tsx`
**Lines:** 38-48

```typescript
useEffect(() => {
  const fallbackTimeout = setTimeout(() => {
    if (showSplash) {  // <-- READS showSplash
      console.warn('[SplashScreen] Fallback timeout (4s) - forcing reveal');
      setContentReady(true);
      setShowSplash(false);  // <-- MODIFIES showSplash
    }
  }, 4000);
  return () => clearTimeout(fallbackTimeout);
}, [showSplash]);  // <-- showSplash IN DEPS
```

**Problem:** When `showSplash` changes to false (normal completion), the effect re-runs, creating a new 4-second timeout unnecessarily.

**Fix:** Use `[]` deps and read `showSplash` from a ref for the conditional check.

---

### 5. Landing.tsx - Initial load animation loop potential

**File:** `src/pages/Landing.tsx`
**Lines:** 199-205

```typescript
useEffect(() => {
  if (currentView !== 'loading' && !initialLoadComplete) {
    const timer = setTimeout(() => setInitialLoadComplete(true), 50);
    return () => clearTimeout(timer);
  }
}, [currentView, initialLoadComplete]);  // <-- initialLoadComplete MODIFIED by effect
```

**Problem:** While there's a guard `!initialLoadComplete`, having it in deps means every time `currentView` changes, the effect body is evaluated. If `currentView` changes rapidly, multiple timers could stack.

**Fix:** Remove `initialLoadComplete` from deps since the guard prevents re-execution anyway.

---

### 6. QuickInput.tsx - Draft persistence with stale deps

**File:** `src/pages/QuickInput.tsx`
**Lines:** 146-150

```typescript
useEffect(() => {
  if (!draftLoaded) return;
  const timer = setTimeout(persistDraft, 500);
  return () => clearTimeout(timer);
}, [selectedCards, desire, step, persistDraft, draftLoaded]);
```

**Problem:** `persistDraft` is a useCallback that may not have stable identity. If `persistDraft` recreates on every render, this debounce effect re-runs constantly.

**Verify:** Check if `persistDraft` useCallback has correct deps.

---

### 7. RitualPicker.tsx - Synthesis polling with step state

**File:** `src/pages/RitualPicker.tsx`
**Lines:** 209-221

```typescript
useEffect(() => {
  if (step !== 'generating' || !currentCycle?.id) return;
  // ... checks and sets step
  setStep('rank');  // <-- MODIFIES step
  // ...
}, [step, currentCycle]);  // <-- step IN DEPS
```

**Problem:** Effect reacts to `step` but also modifies it. While guarded, this pattern is fragile.

---

## MEDIUM Priority Issues

### 8. OfflineBanner.tsx - wasOffline state read without dep

**File:** `src/components/OfflineBanner.tsx`
**Lines:** 21-36

```typescript
useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    if (wasOffline) {  // <-- READS wasOffline
      setTimeout(() => setWasOffline(false), 3000);
    }
  };
  // ...
}, []);  // <-- wasOffline NOT in deps - stale closure!
```

**Problem:** `wasOffline` is read in the callback but not in deps. The callback will always see the initial value of `wasOffline`.

**Fix:** Either add `wasOffline` to deps, or use a ref.

---

### 9. WaitingForPartner.tsx - Interval without couple/user deps

**File:** `src/components/WaitingForPartner.tsx`
**Lines:** 58-100

The interval callback reads `couple` and `user` but they're obtained from closure, not deps.

---

### 10. useRitualFlow.ts - loadCycleData in deps causes re-subscribe

**File:** `src/hooks/useRitualFlow.ts`
**Lines:** 335-337

```typescript
useEffect(() => {
  loadCycleData();
}, [loadCycleData]);
```

If `loadCycleData` callback identity isn't stable (missing deps in its useCallback), this runs repeatedly.

---

### 11. usePremium.ts - refresh function in interval deps

**File:** `src/hooks/usePremium.ts`
**Lines:** 97-100

```typescript
useEffect(() => {
  const interval = setInterval(refresh, 60000);
  return () => clearInterval(interval);
}, [refresh]);
```

If `refresh` identity isn't stable, interval gets cleared and recreated constantly.

---

### 12. Profile.tsx - refreshPremium in deps

**File:** `src/pages/Profile.tsx`
**Lines:** 38-49

```typescript
useEffect(() => {
  // ...
  refreshPremium();
  // ...
}, [searchParams, refreshPremium]);
```

If `refreshPremium` isn't stable, effect runs on every render.

---

## LOW Priority Code Smells

1. **TimeRangePicker.tsx:40** - Effect syncs `activeQuickSlot` based on props. OK but could use useMemo instead.

2. **MemoryReactions.tsx:39** - Effect calls `fetchReactions()` on mount. OK.

3. **StreakBadge.tsx:44** - Effect calls `fetchStreak()` on `couple?.id` change. OK.

4. **Blog.tsx:34** - Effect adds structured data. OK, but runs on every mount.

5. **BlogArticle.tsx:132** - Effect adds structured data based on article. OK.

6. **FAQ.tsx:34** - Effect adds structured data. OK.

7. **Memories.tsx:70** - Effect fetches data. Has `couple?.id` as dep which is fine.

8. **NotFound.tsx:11** - Effect logs 404. OK.

9. **useSEO.ts:35** - Effect updates meta tags. OK, deps are props.

10. **useSurpriseRitual.ts:59** - Effect calls fetch on mount. OK.

11. **usePresence.ts:16** - Effect sets up presence channel. OK.

12. **useAnalytics.ts:61** - Effect tracks page views. OK.

---

## Patterns to Avoid (Codebase Guidelines)

### Anti-Pattern 1: State in deps that effect modifies

```typescript
// BAD
useEffect(() => {
  if (someCondition) {
    setSomeState(newValue);  // Modifies someState
  }
}, [someState]);  // someState in deps - LOOP!

// GOOD - use a ref to track "already ran"
const hasRun = useRef(false);
useEffect(() => {
  if (someCondition && !hasRun.current) {
    hasRun.current = true;
    setSomeState(newValue);
  }
}, [someCondition]);  // Only condition in deps
```

### Anti-Pattern 2: Reading state in callbacks without deps

```typescript
// BAD - stale closure
useEffect(() => {
  const handler = () => {
    console.log(someState);  // Always sees initial value!
  };
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []);

// GOOD - include in deps or use ref
const stateRef = useRef(someState);
stateRef.current = someState;
useEffect(() => {
  const handler = () => {
    console.log(stateRef.current);  // Always fresh!
  };
  // ...
}, []);
```

### Anti-Pattern 3: Unstable callback in deps

```typescript
// BAD - callback recreates every render
const doSomething = () => { /* uses state */ };
useEffect(() => {
  doSomething();
}, [doSomething]);  // Runs every render!

// GOOD - wrap in useCallback with correct deps
const doSomething = useCallback(() => {
  /* uses state */
}, [state]);
```

---

## Recommended Actions

### Immediate (Before next deploy)

1. Fix PickPhase.tsx auto-transition loop (blocking user flow)
2. Fix SynthesisAnimation.tsx timeout dependencies
3. Fix use-toast.ts listener registration

### Short-term (This week)

4. Audit all useCallback dependencies in hooks/
5. Fix SplashScreen.tsx fallback timeout
6. Fix OfflineBanner.tsx stale closure

### Long-term (Codebase health)

7. Add ESLint rule `react-hooks/exhaustive-deps` with warnings
8. Create hook testing utilities to catch these patterns
9. Document useEffect patterns in CONTRIBUTING.md

---

## Verification Checklist

For each fix:
- [ ] Identify exact line numbers
- [ ] Write minimal reproduction
- [ ] Apply fix
- [ ] Verify no console errors
- [ ] Test edge cases (rapid clicks, back navigation)
- [ ] Check for regressions in related flows

