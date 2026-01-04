# Strategic AI Implementation - Complete

## ✅ Changes Completed (27 Dec 2025)

### Problem Identified

The AI was losing training progress between sessions because:

1. **Physics Mismatch**: Trainer used fake Node.js physics, browser used real Phaser physics
2. **Local Optima**: 3-position sampling was helping networks find shots, but they weren't learning to aim properly
3. **Bad Metrics**: Fitness function rewarded "shot first" and "network angle chosen" which were meaningless

### Solution: Strategic Architecture

## 🏗️ Architecture Changes

### 1. Network Outputs: 1 → 3

**Before:** `[aimAngle]` (0 to 2π)

**After:**

- `actionType` (0-1, sigmoid): <0.5 = move, ≥0.5 = shoot
- `movementDistance` (-1 to +1, tanh): direction and magnitude
- `aimAngle` (0-2π): shooting angle

### 2. Input Encoding: 22 → 24

**Current State (14):**
1-3. self.x, self.y, self.healthPercent
4-6. enemy.x, enemy.y, enemy.healthPercent
7-14. terrain distances (8 directions)

**Feedback (10):** 15. lastAction (shoot=1, move=0) 16. lastMovementDistance (-1 to +1) 17. lastAngle
18-19. explosion.x, explosion.y
20-21. distToSelf, distToEnemy 22. damageTaken 23. damageDealt 24. didHitEnemy (0/1)

### 3. Browser Look-Ahead (puppeteer-game-runner.js)

**Before:**

- Tests 3 positions (left, current, right)
- Tests 12 angles per position = 36 total
- Always returns best angle regardless of success

**After:**

- Tests ONLY current position
- Tests network angle + 36 evenly spaced angles (every 10°) = 37 total
- **Success criteria:**
  - Landing within 80px of enemy (damage radius)
  - Clear line-of-sight to enemy
  - > 150px from self (safety)
- **Returns null if no successful shot found**

### 4. Strategic Decision Flow

```
Network outputs: actionType, movementDistance, aimAngle

IF actionType < 0.5 (MOVE):
  → Execute movement (50-150px based on movementDistance)
  → End turn

IF actionType ≥ 0.5 (SHOOT):
  → Run look-ahead from current position
  → IF successful shot found:
      → Execute shot
      → End turn
  → IF no successful shot:
      → Treat as move instead (fallback)
      → End turn
```

### 5. Fitness Function (Outcome-Based)

**REMOVED:**

- ❌ Movement penalty
- ❌ "Shot first try" bonus
- ❌ "Network angle chosen" bonus

**NEW:**

```javascript
fitness = 100
  - selfDamage × 3        // Reduced penalty (was 5)
  + enemyDamage × 5       // Increased reward (was 3)
  + (enemyDamage / Math.max(turns, 1)) × 10  // Efficiency bonus
  + (win ? 150 : 0)       // Win bonus
  + (enemyDamage > 80 && selfDamage < 10 ? 50 : 0)  // Clean win
```

## 📁 Files Modified

### ai/training/puppeteer-game-runner.js

- ✅ Updated `makeAIDecision()` to handle 3 network outputs
- ✅ Removed 3-position sampling logic
- ✅ Implemented strategic shoot/move decision
- ✅ Added success criteria for shots (distance, LOS, safety)
- ✅ Returns null when no successful shot available

### ai/simple/self-damage-trainer.js

- ✅ Updated `networkConfig`: 22→24 inputs, 1→3 outputs
- ✅ Updated `encodeSelfDamageGameState()` with strategic feedback
- ✅ **Removed** `decodeNetworkOutput()` (fake physics)
- ✅ Updated fitness function (outcome-based rewards)
- ✅ Updated architecture: [24, 16, 10] hidden layers

### ai/checkpoints/

- ✅ Deleted all old checkpoints (incompatible with new 3-output architecture)

## 🎯 Expected Behavior

### Generation 1 (Random Initialization)

- Networks output random actions
- ~50% shoot, ~50% move
- High self-damage (~20-30 HP)
- Low enemy damage (~5-10 HP)

### Generation 5-10 (Learning Basics)

- Networks learn to prefer shooting over random movement
- Self-damage decreases (~10-15 HP)
- Enemy damage increases (~20-30 HP)
- Some networks discover safe shooting angles

### Generation 20-30 (Strategic Mastery)

- Networks move to better positions before shooting
- Self-damage minimal (<5 HP)
- Enemy damage high (>50 HP)
- High damage-per-turn efficiency

## 🧪 Testing Commands

### Quick Test (1 generation)

```bash
cd ai/simple
node self-damage-trainer.js --pop 3 --gen 1 --games 2 --tabs 1 --test
```

### Full Training (10 generations)

```bash
cd ai/simple
node self-damage-trainer.js --pop 20 --gen 10 --games 8 --tabs 3 --headless
```

### Continue Training

```bash
# Automatically resumes from last checkpoint
node self-damage-trainer.js --pop 20 --gen 10 --games 8 --tabs 3 --headless
```

## 📊 Success Metrics

Watch for these improvements across generations:

1. **Self-Damage** ↓ (goal: <5 HP by gen 20)
2. **Enemy Damage** ↑ (goal: >60 HP by gen 20)
3. **Damage/Turn** ↑ (goal: >20 HP/turn)
4. **Win Rate** ↑ (goal: >80% by gen 20)

## 🔧 Troubleshooting

### If training seems stuck:

- Check that dev server is running on port 3001
- Verify browser can access game (try --headed mode)
- Increase population size (--pop 30)
- Increase games per network (--games 12)

### If networks don't learn to move:

- This is expected! Movement is hard to discover
- Networks may find good shooting positions through evolution
- Strategic movement should emerge after 20+ generations

### If self-damage doesn't decrease:

- Check fitness function is working (look at CLI output)
- Verify explosion feedback is captured correctly
- May need to increase penalty multiplier (currently 3x)

## 🎉 What This Fixes

1. ✅ **Training Progress Preserved**: Real physics means training actually accumulates knowledge
2. ✅ **Strategic Behavior**: Network can choose when to reposition vs shoot
3. ✅ **Better Fitness Signal**: Rewards outcomes, not fake intermediate metrics
4. ✅ **Scalable**: Can add multi-move logic later if needed

## 📝 Notes

- Old checkpoints are INCOMPATIBLE (1 output vs 3 outputs)
- Training will start fresh from generation 0
- Expect training to take longer initially (learning is harder without crutches)
- BUT results should be much more robust and transferable

---

**Implementation Date:** 27 December 2025
**Status:** ✅ Complete - Ready for Testing
