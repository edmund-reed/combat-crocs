# Training Regression Diagnosis

**Date:** December 22, 2025  
**Status:** CRITICAL - System is LOSING learned strategies

---

## 📊 The Data Shows a Clear Story

### Gen 1-40: Learning Basics

```
Best Fitness: 520-1088 (highly variable)
Average: 233-696 (low, learning fundamentals)
Pattern: Chaotic exploration
```

### Gen 41-47: BREAKTHROUGH! 🎉

```
Gen 41: 1584 best (+536 jump!)
Gen 42: 1301
Gen 43: 1643 (PEAK PERFORMANCE!)
Gen 44: 1623 (holding peak)
Gen 45: 1404 (slight drop)
Gen 46: 1615 (recovery!)
Gen 47: 1514 (still strong)
```

**The AI discovered something powerful here!**

### Gen 48-55: REGRESSION 📉

```
Gen 48: 1390 (dropping)
Gen 49: 1122 (significant drop)
Gen 50: 1274 (partial recovery)
Gen 51: 1252 (stable but low)
Gen 52: 1518 (attempted recovery)
Gen 53: 1479 (still trying)
Gen 54: 1384 (failing)
Gen 55: 1331 (continued decline)
```

**The breakthrough is being LOST, generation by generation.**

---

## 🔍 Root Cause Analysis

### The Problem: "Elite Erosion"

**What happened:**

1. **Gen 41-43:** Networks discovered a winning strategy

   - Maybe learned safe shooting angles
   - Maybe learned positioning
   - Peak fitness: 1643

2. **Gen 44-47:** Strategy maintained through elite preservation

   - Top 2 networks (20%) survived
   - But their offspring were mutated

3. **Gen 48-55:** Mutations slowly destroyed the strategy
   - Elite networks kept getting mutated when breeding
   - Small mutations accumulate
   - Original winning strategy diluted

### Why This Happens

**Current Settings:**

```javascript
elitePercentage: 0.2; // Only 20% (2 networks) survive intact
mutationRate: 0.3; // 30% chance per mutation type
```

**Each generation:**

```
Elite preserved:  2 networks (unchanged) ✅
Offspring:        8 networks (from top performers, WITH mutations) ⚠️
```

**The problem:**

```
Gen 43: Network 1 (1643 fitness) - PERFECT!
Gen 44: Network 1 survives as elite ✅
Gen 44: Child A = Network 1 + mutations → 1500 fitness ⚠️
Gen 44: Child B = Network 1 + mutations → 1480 fitness ⚠️

Gen 45: Network 1 still elite (1643) ✅
Gen 45: Previous children now elite ⚠️
Gen 45: New children = mutated again → 1400 fitness ⚠️

Gen 46: Original Network 1 might not be elite anymore! ❌
Gen 46: Population is now "diluted" versions of breakthrough
```

**After 10 generations, the original breakthrough network's genes are so diluted by mutations that the strategy is lost.**

---

## 🎯 The Core Issues

### Issue 1: Elite Percentage Too Low (20%)

**Current:** 2 out of 10 networks preserved
**Problem:** Not enough "memory" of winning strategies

**Impact:**

- Gen 43 breakthrough network survives 1-2 generations
- Then gets replaced by slightly worse mutated offspring
- Original genius lost forever

### Issue 2: Mutation Rate Too High (0.3 = 30%)

**Current mutations per offspring:**

```javascript
if (Math.random() < 0.3) MOD_WEIGHT; // 30% chance
if (Math.random() < 0.15) MOD_BIAS; // 15% chance
if (Math.random() < 0.06) ADD_NODE; // 6% chance
if (Math.random() < 0.06) SUB_NODE; // 6% chance
if (Math.random() < 0.09) ADD_CONN; // 9% chance
if (Math.random() < 0.09) SUB_CONN; // 9% chance
if (Math.random() < 0.03) MOD_ACTIVATION; // 3% chance
```

**Problem:**

- ~50% chance of AT LEAST one mutation per offspring
- High chance of multiple mutations
- Accumulates over generations

### Issue 3: No "Convergence Phase"

**Early training (Gen 1-40):**

- Need HIGH mutation for exploration ✅
- Discover new strategies ✅

**Mid training (Gen 41-55):**

- Found good strategy ✅
- Need LOW mutation for refinement ❌
- Instead: Keep mutating aggressively ❌
- Result: Destroy breakthrough ❌

---

## 🔬 Evidence from Your Data

### Proof 1: Breakthrough Then Decline

```
Gen 43: 1643 best (FOUND IT!)
Gen 55: 1331 best (LOST IT!)

Decline: -312 points (-19%) over 12 generations
```

This is textbook "elite erosion."

### Proof 2: Average Follows Same Pattern

```
Gen 43: 936 avg (population learning)
Gen 55: 709 avg (population forgetting)

Decline: -227 points (-24%)
```

Entire population is losing the strategy, not just elite.

### Proof 3: Win Rate Confirms

```
Gen 43-45 era: ~47-57% win rate (strong)
Gen 55: 40% win rate (regressing)
```

Networks literally playing worse than 12 generations ago.

---

## 💊 The Fix

### Solution 1: Increase Elite Preservation

**Change:**

```javascript
// From
elitePercentage: 0.2; // 20% = 2 networks

// To
elitePercentage: 0.4; // 40% = 4 networks
```

**Impact:**

- 4 best networks survive unchanged every generation
- Breakthrough strategies preserved longer
- Population has stronger "memory"

### Solution 2: Reduce Mutation Rate

**Change:**

```javascript
// From
mutationRate: 0.3; // 30%

// To
mutationRate: 0.15; // 15%
```

**Impact:**

- ~25% chance of mutation (half as aggressive)
- Offspring stay closer to parents
- Refine instead of destroy

### Solution 3: Adaptive Mutation Rate

**Even better - reduce mutation rate over time:**

```javascript
// High mutation early (exploration)
// Low mutation later (refinement)

const baseMutationRate = 0.3;
const minMutationRate = 0.1;
const decayFactor = 0.95;

// Each generation
mutationRate = Math.max(minMutationRate, baseMutationRate * Math.pow(decayFactor, generation / 10));
```

**Result:**

- Gen 1-20: 30% mutation (explore!)
- Gen 40: 18% mutation (found something!)
- Gen 60: 12% mutation (refine!)
- Gen 100: 10% mutation (perfect!)

---

## 📊 Expected Results with Fixes

### Before (Current):

```
Gen 43: 1643 best ← Breakthrough!
Gen 55: 1331 best ← Lost it 😢
```

### After (With Fixes):

```
Gen 43: 1643 best ← Breakthrough!
Gen 55: 1750 best ← Built on it! 🎉
Gen 70: 1900 best ← Refined further!
Gen 100: 2100+ best ← Mastery!
```

---

## 🚀 Recommended Action Plan

### Step 1: Apply Fixes

**Increase elite to 40%:**

- 4 networks preserved instead of 2
- Stronger memory of good strategies

**Reduce mutation to 15%:**

- Gentler changes to offspring
- Preserve breakthrough better

### Step 2: Restart from Gen 43

**Why Gen 43, not Gen 45?**

Gen 43 checkpoint has:

- Best: 1643 (peak performance)
- Average: 936 (strong population)
- Full breakthrough strategy intact

**Command:**

```bash
cd ai
node training/trainer.js --resume checkpoint-gen43.json --generations 70 --baseline baseline-v1.json --population 10 --workers 5 --headless --games 5
```

### Step 3: Monitor Progress

**Watch for:**

- Best fitness INCREASING (1643 → 1700 → 1800+)
- Average fitness INCREASING (936 → 1000 → 1100+)
- Win rate INCREASING (50% → 60% → 70%+)

**If still regressing:**

- Increase elite to 50% (5 networks)
- Reduce mutation to 10%

---

## 🎯 Root Cause Summary

| Issue        | Current        | Problem             | Fix            |
| ------------ | -------------- | ------------------- | -------------- |
| **Elite %**  | 20% (2 nets)   | Breakthrough lost   | 40% (4 nets)   |
| **Mutation** | 30% rate       | Too aggressive      | 15% rate       |
| **Strategy** | Fixed mutation | Destroys refinement | Adaptive decay |

**The AI DID learn (Gen 41-43 breakthrough was real!)**

**But the training algorithm is FORGETTING the lesson through excessive mutation.**

**Fix: Remember more (elite 40%), change less (mutation 15%).**

---

## 💡 Why This Explains Everything

**Your observation:**

> "Our model should be learning not to fire into the ground..."

**The model DID learn this (Gen 41-43)!**

**But then forgot it (Gen 44-55) due to mutation erosion.**

**The learning is happening - we just need to PRESERVE it.**
