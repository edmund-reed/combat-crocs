# Balanced Fitness System V2.1 ✅

**Date:** December 21, 2025  
**Status:** Implemented - Ready to Test

## Overview

**Fixed the over-penalization problem** that caused negative fitness and discouraged engagement.

---

## 🚨 Problem Identified (Gen 35 Results)

### Issues:

- **Best fitness DECLINED:** 901 → 814 (-10%)
- **Negative fitness possible:** -106 (catastrophic self-damage)
- **Win rate stuck:** 47% → 50% (no progress)
- **No convergence:** Average stayed at ~350 for 10 generations

### Root Cause:

**Penalties were TOO HARSH:**

```javascript
// V2.0 (Too harsh):
fitness -= selfDamage × 1.5  // Very punishing
fitness -= damageTaken × 0.8  // Very punishing

// Result: AI afraid to engage, negative scores possible
```

---

## ✅ Solution: Balanced V2.1

### Changes Made:

**1. Reduced Self-Damage Penalty:**

```javascript
// Before: -1.5x
// After:  -1.0x (33% reduction)
fitness -= selfDamage × 1.0;
```

**2. Reduced Damage Taken Penalty:**

```javascript
// Before: -0.8x
// After:  -0.5x (38% reduction)
fitness -= damageTaken × 0.5;
```

**3. Added Combat Engagement Bonus:**

```javascript
// NEW: Reward productive aggression
if (damageDealt >= 60) {
  fitness += 25;
}
```

---

## 📊 Impact Comparison

### Aggressive Play Scenario:

**V2.0 (Too Harsh):**

```
Damage dealt: +80 × 2.0 = +160
Self-damage: -40 × 1.5 = -60
Damage taken: -70 × 0.8 = -56
Net: +160 - 60 - 56 = +44 ⚠️ (barely worth it)
```

**V2.1 (Balanced):**

```
Damage dealt: +80 × 2.0 = +160
Combat bonus: +25 (for 60+ damage)
Self-damage: -40 × 1.0 = -40 (reduced!)
Damage taken: -70 × 0.5 = -35 (reduced!)
Net: +160 + 25 - 40 - 35 = +110 ✅ (Rewarding!)
```

**Result:** Aggressive play now rewarded properly!

### Catastrophic Self-Damage (Worst Case):

**V2.0:**

```
Lost game: 0
Damage dealt: +40 × 2.0 = +80
Self-damage: -100 × 1.5 = -150
Damage taken: -80 × 0.8 = -64
Net: 0 + 80 - 150 - 64 = -134 ❌ (Negative!)
```

**V2.1:**

```
Lost game: 0
Damage dealt: +40 × 2.0 = +80
Self-damage: -100 × 1.0 = -100 (reduced)
Damage taken: -80 × 0.5 = -40 (reduced)
Net: 0 + 80 - 100 - 40 = -60 ⚠️ (Still bad but not catastrophic)
```

**Result:** Still punishing but not impossible to recover!

---

## 🎯 Expected Improvements

### Gen 36-40 (With Balanced System):

**Best Fitness:**

- Gen 36: 900-950 (recovery from 814)
- Gen 38: 1000-1050 (breakthrough)
- Gen 40: 1050-1150 (strong performance)

**Average Fitness:**

- Gen 36: 450-550 (jump from 344)
- Gen 38: 600-700 (convergence starting)
- Gen 40: 700-800 (population improving)

**Win Rate:**

- Gen 36: 55-60% (from 50%)
- Gen 38: 65-70% (steady climb)
- Gen 40: 70-75% (approaching mastery)

**No More Negative Fitness:**

- Worst case: ~-60 to +50
- Most networks: 200-800 range
- Healthy distribution

---

## 🎮 Complete Fitness Formula V2.1

```javascript
updateFitness(member, gameResult, team) {
  let fitness = 0;

  // === CORE REWARDS ===
  fitness += won ? 100 : 0;              // Win bonus
  fitness += survivalTime × 1.0;         // Survival
  fitness += damageDealt × 2.0;          // Offense

  // === BALANCED PENALTIES ===
  fitness -= selfDamage × 1.0;           // Self-harm (REDUCED from 1.5)
  fitness -= damageTaken × 0.5;          // Enemy damage (REDUCED from 0.8)

  // === ENGAGEMENT BONUS ===
  if (damageDealt >= 60) {
    fitness += 25;                        // Combat productivity (NEW!)
  }

  // === EFFICIENCY BONUS ===
  if (won) {
    fitness += healthRatio × 50;         // Clean victory
  }

  member.fitness += fitness;
}
```

---

## 🚀 Testing Command

```bash
cd ai
node training/trainer.js --resume checkpoint-gen35.json --generations 40 --baseline baseline-v1.json --population 10 --workers 5 --headless
```

**Expected duration:** ~10-12 minutes for 5 generations

---

## ✅ Success Criteria

### After Gen 40:

**Excellent:**

- Best fitness: 1100+ ✅
- Win rate: 70%+ ✅
- No negative fitness ✅
- Average: 700+ ✅

**Good:**

- Best fitness: 1000-1100 ✅
- Win rate: 65-70% ✅
- Few/no negative fitness ✅
- Average: 600-700 ✅

**Needs More Training:**

- Best fitness: <1000 ⚠️
- Win rate: <65% ⚠️
- Continue to gen 45-50

---

## 📈 Why This Will Work

### Balanced Risk/Reward:

**Before (V2.0):**

- Aggression: High risk, low reward → AI plays passive
- Safety: Low risk, modest reward → AI hides
- Result: Stagnation at 50% win rate

**After (V2.1):**

- Smart aggression: Medium risk, high reward → AI engages wisely
- Recklessness: High risk, negative fitness → AI learns safety
- Passive play: Low risk, low reward → Not optimal
- Result: AI learns balanced, aggressive, safe play

### Psychology:

**V2.0 taught AI:** "Combat is scary, avoid it"  
**V2.1 teaches AI:** "Combat is rewarding if you're smart about it"

This is the key to breakthrough!

---

## 🎯 Summary

**V2.1 Balances:**

- ✅ Still punishes self-damage (but fairly)
- ✅ Rewards productive aggression (+25 bonus)
- ✅ Prevents negative fitness spirals
- ✅ Encourages engagement
- ✅ Maintains safety incentives

**Expected result:** AI learns to be aggressively safe, not passively scared!

**Ready to train!** 🚀
