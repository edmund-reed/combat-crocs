# AI Training Diagnosis - Combat Crocs

## Summary

After extensive testing (3,000+ games across multiple runs), the AI shows **minimal learning** (0.5-4 HP improvement) despite fixing critical bugs.

## Test Results

### Test 1: Before Bug Fixes

- **10 generations, 40 pop, 6 games** = 2,400 total games
- Result: **3.8 HP improvement** (4.7%)
- Time: 48 minutes

### Test 2: Before Bug Fixes

- **5 generations, 40 pop, 6 games** = 1,200 total games
- Result: **3.8 HP improvement** (4.7%)
- Time: 48 minutes

### Test 3: After Bug Fixes (360° + Persistence)

- **5 generations, 20 pop, 6 games** = 600 total games
- Result: **0.5 HP improvement** (0.7%)
- Time: 5.6 minutes
- **Gen 1:** 75.0 HP → **Gen 5:** 74.5 HP

## Bugs Fixed

### ✅ Bug #1: Angle Range (CRITICAL)

**Problem:** Network could only output 0-180° angles

```javascript
// Before
const aimAngle = outputs[0] * Math.PI; // 0-180° only

// After
const aimAngle = outputs[0] * 2 * Math.PI; // 0-360° ✅
```

**Impact:** AI can now shoot in any direction, not just half the circle.

### ✅ Bug #2: Model Persistence (CRITICAL)

**Problem:** Each run created random networks, didn't load previous best

**After:** Now loads `ai/models/self-damage-avoidance.json` and seeds Network #1

**Impact:** Should enable continuous improvement across runs.

## Current Problems

### ❌ Problem #1: Still No Learning

Despite having:

- Full 360° angle range
- Model persistence
- 20 spatial inputs (terrain in 8 directions)
- Strong fitness signal (-20× penalty for self-damage)
- Larger network ([16, 12, 8])

**The AI is not learning to avoid self-damage.**

### ❌ Problem #2: Logs Missing Input Data

Log files contain only game summaries:

```json
{
  "result": {
    "selfDamage": 100,
    "fitness": -1900,
    "winner": 2
  },
  "note": "Turn-by-turn logging requires game runner modifications"
}
```

**Missing:** Actual input values (terrain distances, position, health, etc.)

**Why this matters:** Can't verify if:

- Terrain distances are calculated correctly
- Inputs are non-zero
- Position/health data is accurate
- The network is receiving meaningful data

### ❌ Problem #3: Checkpoint Numbering

Checkpoint saved as `gen05` instead of `gen10` (should continue from previous run's gen05)

## Root Cause Theories

### Theory 1: Inputs Are Zeros/Invalid ⚠️ (MOST LIKELY)

**Evidence:**

- No learning after 3,000+ games
- Can't verify inputs without turn logs
- Game state might not be captured correctly

**Next Step:** Add console logging of first 3 turns to verify inputs

### Theory 2: Problem Too Complex for Approach

**Evidence:**

- Neural network might not be suitable for this problem
- Spatial reasoning in chaotic physics environment is hard
- 75 HP self-damage might be baseline "best possible"

**Counter:** Simple rule should work: "shoot away from ground"

### Theory 3: Fitness Signal Too Weak/Noisy

**Evidence:**

- High variance between generations (↓↑↓↑ pattern)
- Random factors in physics/terrain
- Small population size

**Counter:** Fitness signal is strong (-20× multiplier)

### Theory 4: Evolution Not Working

**Evidence:**

- No convergence trend
- High inter-generation volatility

**Possible causes:**

- Mutation rate too high (0.2)
- Population too small (20-40)
- Not enough generations (5-10)

## Recommended Next Steps

### Priority 1: Verify Inputs Are Non-Zero

Add console logging to print actual input values:

```javascript
console.log("Turn 1 inputs:", {
  terrainRight: inputs[9],
  terrainUp: inputs[11],
  selfX: inputs[1],
  selfY: inputs[2],
});
```

Run 1 game in headed mode and verify inputs change each turn.

### Priority 2: Simplify Problem

Test with trivial case:

- Input: Just self Y position
- Output: Angle
- Rule: If Y > 400, shoot up (270°), else shoot down (90°)
- Should achieve near-zero self-damage immediately

### Priority 3: Try Different Approach

If neural network fails even simple case, consider:

- Supervised learning (train on "good" vs "bad" shots)
- Rule-based system with learning parameters
- Different AI architecture (decision trees, etc.)

## Key Questions to Answer

1. **Are inputs being calculated?** → Need turn-by-turn logs
2. **Are inputs meaningful?** → Need to see actual values
3. **Is network capable of simple learning?** → Need trivial test case
4. **Is evolution working at all?** → Need to see weight changes

## Conclusion

The angle range and model persistence bugs were critical fixes, but **the AI still isn't learning**. Without turn-by-turn input logging, we cannot diagnose whether the problem is:

- Bad input data (most likely)
- Network architecture
- Fitness function
- Evolution algorithm
- Problem complexity

**Next action:** Add input validation logging and run diagnostic test.
