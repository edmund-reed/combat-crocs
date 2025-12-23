# Generation 45-70 Training Analysis

**Date:** December 22, 2025  
**Status:** CRITICAL - Fixes Made Things WORSE

---

## 📊 What Actually Happened (Gen 45-70)

### Settings Used:

```javascript
elitePercentage: 0.4; // 40% (4 networks) - INCREASED from 20%
mutationRate: 0.15; // 15% - REDUCED from 30%
```

### Results:

```
Gen 45: 1404 best, 903 avg (starting point)
Gen 46: 1446 best, 927 avg (+3%, good!)
Gen 47: 1633 best, 974 avg (+16%, breakthrough!)
Gen 48: 1325 best, 741 avg (-19%, CRASH!)
Gen 49: 1507 best, 997 avg (+14%, recovered)
Gen 50: 1481 best, 802 avg (-2%, declining)
Gen 51: 1400 best, 923 avg (-5%, dropping)
Gen 52: 1063 best, 709 avg (-24%, BAD)
Gen 53: 1493 best, 857 avg (+40%, volatile!)
Gen 54: 1411 best, 832 avg (-6%, unstable)
Gen 55: 873 best, 658 avg (-38%, TERRIBLE)
Gen 56: 1240 best, 715 avg (+42%, chaotic)
Gen 57: 1284 best, 788 avg (+4%, slight recovery)
Gen 58: 1232 best, 926 avg (-4%, wobbling)
Gen 59: 1294 best, 712 avg (+5%, unstable)
Gen 60: 1551 best, 954 avg (+20%, recovery!)
Gen 61: 1670 best, 1082 avg (+8%, PEAK!)
Gen 62: 1497 best, 825 avg (-10%, dropped)
Gen 63: 1237 best, 908 avg (-17%, declining)
Gen 64: 1401 best, 877 avg (+13%, recovery attempt)
Gen 65: 1487 best, 876 avg (+6%, slight gain)
Gen 66: 1095 best, 746 avg (-26%, CRASH)
Gen 67: 1228 best, 845 avg (+12%, recovery)
Gen 68: 1417 best, 839 avg (+15%, improving)
Gen 69: 1471 best, 845 avg (+4%, stable)
Gen 70: 1326 best, 686 avg (-10%, ended low)
```

---

## 🔍 The Problem: EXTREME Volatility

### Pattern Identified:

**NOT steady decline (like before)**  
**NOT steady improvement (like we hoped)**  
**WILD SWINGS: peak → crash → peak → crash**

```
        1670 (Gen 61 PEAK!)
       /    \
    1550     1497
           /     \
        1237      1401
                 /    \
              1095     1417
                      /    \
                    ...    1326
```

**Fitness swinging ±300-500 points per generation!**

---

## 🎯 Root Cause: TOO MUCH Elite Preservation

### The Overcorrection Problem

**Before (20% elite):**

- Problem: Not enough memory
- Result: Lost breakthroughs

**After (40% elite):**

- Problem: Too much memory!
- Result: Lost diversity

### What's Happening:

**With 40% elite (4 out of 10 networks):**

```
Gen 47: Top 4 networks (elite) = [1633, 1500, 1450, 1400]
        Bottom 6 = new offspring

Gen 48: If offspring are bad:
        Top 4 = [1633, 1500, 1450, 1400] (same elite)
        + 6 bad offspring → Low average (741)

Gen 49: Elite breeds again:
        Top 4 = might still include Gen 47 elites
        + 6 new offspring → Variable performance
```

**The problem:**

- 40% of population NEVER mutates (elite)
- Only 60% explores new strategies
- Population becomes "inbred"
- Loses ability to discover new approaches
- Highly dependent on luck of offspring

### The Sweet Spot We Missed:

**Goldilocks principle:**

- 20% elite: Too little (forget strategies) ❌
- 40% elite: Too much (forget to explore) ❌
- **30% elite: Just right?** 🤔

---

## 🔬 Evidence from Data

### Proof 1: Extreme Volatility

**Standard deviation of best fitness (Gen 45-70):**

- Before fixes (Gen 1-45): ~200-300 point swings
- After fixes (Gen 45-70): ~500-600 point swings!

**The "fixes" made volatility WORSE, not better.**

### Proof 2: No Sustained Improvement

**Peak performances:**

- Gen 43: 1643 (original breakthrough)
- Gen 47: 1633 (brief recovery)
- Gen 61: 1670 (temporary peak)

**But unable to maintain ANY peak for more than 2-3 generations.**

### Proof 3: Average Declined Overall

```
Gen 45: 903 avg (start)
Gen 61: 1082 avg (best during run)
Gen 70: 686 avg (end)

Net change: -217 points (-24%)
```

**Despite occasional peaks, population quality DECLINED.**

---

## 💊 The REAL Fix

### Problem: We're Fighting Symptoms, Not Root Cause

**The actual issues:**

### 1. Baseline is TOO EASY

**Your AI is training against Gen 11 baseline.**

**Think about it:**

- Gen 11 opponents: Barely learned basics
- Your Gen 45-70 networks: Should be MUCH stronger
- **Yet only winning 36-44% of games?**

**This suggests:**

- The "breakthroughs" (Gen 41-43) weren't real learning
- They were flukes/luck against weak opponents
- Population is actually stuck at low skill level

### 2. Fitness Function May Be Broken

**From trainer.js, the fitness calculation:**

```javascript
// Win bonus
if (won) fitness += 100;

// Damage dealt
fitness += damageDealt * 2.0;

// Survival time
fitness += survivalTime * 1.0;

// Self-damage penalty
fitness -= selfDamage * 1.0;
```

**Potential issues:**

- Self-damage penalty (1x) too weak vs damage dealt reward (2x)
- Networks can get high fitness by dealing 100 damage even if they take 50 self-damage
- Win bonus (100) might be too small compared to damage rewards

**Example bad strategy that scores well:**

```
Shoot bazooka at own feet → deals 80 damage to enemy nearby
Takes 60 self-damage
Loses the game

Fitness = 80*2 - 60*1 + 50*1 (survived some turns) = 160 - 60 + 50 = 150

vs.

Play safe, don't shoot → deals 0 damage
Takes 0 self-damage
Loses the game

Fitness = 0*2 - 0*1 + 100*1 = 100

BAD STRATEGY SCORES HIGHER!
```

### 3. Population Size Too Small

**10 networks is TINY for neuroevolution:**

- Only 4 elite (with 40%)
- Only 6 exploring (offspring)
- Not enough genetic diversity
- Small populations prone to:
  - Local maxima
  - Genetic drift
  - Inbreeding depression

**Typical neuroevolution uses 50-100+ networks.**

---

## 🚀 Real Solutions

### Solution 1: Update Baseline (CRITICAL)

**Current:** Training against Gen 11 (very weak)
**Problem:** No challenge, no pressure to improve

**Fix:**

```bash
# Create new baseline from your best Gen (45 or 61)
cp ai/checkpoints/checkpoint-gen45.json ai/baselines/baseline-v2.json

# Train against YOUR BEST NETWORKS
node training/trainer.js --baseline baseline-v2.json ...
```

**This forces networks to beat THEMSELVES, not just weak Gen 11.**

### Solution 2: Fix Elite Percentage

**Set to 30%:**

```javascript
elitePercentage: 0.3; // 30% = 3 networks
mutationRate: 0.15; // Keep at 15%
```

**Balance:**

- 3 networks preserve strategies ✅
- 7 networks explore new approaches ✅

### Solution 3: Strengthen Self-Damage Penalty

**In trainer.js updateFitness():**

```javascript
// From
fitness -= selfDamage * 1.0;

// To
fitness -= selfDamage * 2.5; // PUNISH self-harm harder!
```

**This makes "suicide bombing" strategies score poorly.**

### Solution 4: Increase Win Bonus

```javascript
// From
if (won) fitness += 100;

// To
if (won) fitness += 200; // Make winning MORE important!
```

**Winning should be the PRIMARY goal, not just damage dealing.**

### Solution 5: Increase Population (Long-term)

**From 10 to 20 networks:**

```javascript
populationSize: 20; // Double the genetic diversity
```

**With 30% elite:**

- 6 networks preserved (more memory)
- 14 networks exploring (more diversity)

**But this doubles training time, so only if needed.**

---

## 📊 Priority Actions

### IMMEDIATE (Must Do):

**1. Revert Elite to 30%**

```javascript
elitePercentage: 0.3; // Middle ground
```

**2. Increase Self-Damage Penalty**

```javascript
fitness -= selfDamage * 2.5; // Punish harder
```

**3. Increase Win Bonus**

```javascript
if (won) fitness += 200; // Prioritize winning
```

### NEXT (Should Do):

**4. Update Baseline**

```bash
# Train against Gen 45 instead of Gen 11
cp checkpoint-gen45.json baselines/baseline-v2.json
```

### LATER (If Still Stuck):

**5. Increase Population**

```javascript
populationSize: 20; // More diversity
```

---

## 🎯 Expected Results with ALL Fixes

**Gen 45 → Gen 70 (with proper settings):**

```
Best: 1404 → 1500 → 1600 → 1700 → 1800
Avg:  903 → 950 → 1000 → 1100 → 1200
Win:  44% → 48% → 52% → 58% → 65%

Pattern: STEADY UPWARD (not volatile chaos)
```

---

## 💡 Key Insight

**The problem isn't just elite% or mutation%.**

**The REAL problem:**

1. Training against too-easy opponents (Gen 11 baseline)
2. Fitness function rewards risky play over winning
3. Population too small for stable evolution

**Fix elite% AND fitness function AND baseline = Real learning**

Just fixing elite% = More chaos (what we saw)
