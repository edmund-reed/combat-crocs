# 🎯 Input Simplification V2 - Removing Confusion

## Date: 23 Dec 2025

## Problem Identified:

After Gen 5 training with proper architecture (57 nodes), the network showed:

- **explosionDistance: 80% influence** (good!)
- **BUT: lastExplosionY: 95% influence** (higher!)
- **Position-based learning:** Network memorizes "avoid Y=300" instead of "avoid distance < 150"

### Root Cause: Redundant Explosion Inputs

**Previous inputs (20 total):**

```javascript
inputs.push(feedback.explosionX); // Input 6
inputs.push(feedback.explosionY); // Input 7
inputs.push(explosionDistance); // Input 8
```

**Problem:** Network uses X/Y coordinates to learn **positional patterns** rather than **distance patterns**!

Example:

- ❌ Network learns: "Don't be at X=200, Y=300" (position-specific)
- ✅ Should learn: "Stay >150 pixels from explosion" (generalizable)

## Solution Implemented:

### 1. Removed Explosion X/Y Coordinates

**New inputs (18 total):**

```javascript
// Removed: explosionX, explosionY
inputs.push(explosionDistance); // Keep only distance metric
```

### 2. Benefits:

**Forces Distance-Based Learning:**

- Network MUST use `explosionDistance` to understand safety
- Cannot rely on position shortcuts
- Learns generalizable rule: "distance < 150 = danger"

**Reduces Input Confusion:**

- 3 explosion inputs → 1 explosion input
- Simpler = easier to learn core relationships
- Less noise for the network to process

### 3. Updated Architecture:

**Before:** 20 → [16, 12, 8] → 1 = 57 nodes
**After:** 18 → [16, 12, 8] → 1 = 55 nodes

**Final Input List (18 total):**

1. blastRadius (140)
2. selfX
3. selfY
4. selfHealthPercent
5. didDamageSelf
6. damageTaken
7. **explosionDistance** ← Only explosion metric now!
   8-15. terrainDistances[8] (8 directions)
8. minTerrain
9. rightTerrain
10. safetyMargin

## Expected Results:

### Before Simplification (Gen 5):

- lastExplosionY: 95% ← Using Y position
- explosionDistance: 80% ← Underutilized
- Learning: Position-based patterns

### After Simplification (Expected):

- explosionDistance: **60-80%** ← Primary safety metric
- terrainDown: **70-90%** ← Direction matters
- Learning: **Distance + direction** based patterns

## Additional Discoveries:

### 1. minTerrain (98% influence) ✅

```javascript
const minTerrain = Math.min(...terrainDists);
```

**Why it's important:** Closest wall = self-damage risk zone!

Makes sense - shooting near ANY wall increases self-damage risk.

### 2. Hidden Layer Connections ✅

```
hidden_21 → hidden_47: +0.342
hidden_28 → hidden_38: -0.330
```

This is CORRECT! Multi-layer learning is working!

### 3. terrainDown Still Relevant

- Gen 5: 87% influence (was 100% in broken model)
- Still matters, just not the ONLY factor anymore
- Network learning multi-directional terrain awareness

## Migration Notes:

**Files Updated:**

- ✅ `ai/simple/self-damage-trainer.js`
  - Updated `encodeSelfDamageGameState()`: removed explosionX/Y
  - Updated `getInputLabels()`: removed from label list
  - Updated `config.networkConfig.inputs`: 20 → 18
  - Updated comments throughout

**Files Cleaned:**

- ✅ Deleted `ai/models/self-damage-avoidance.json` (20-input model)
- ✅ Deleted `ai/checkpoints/self-damage-checkpoint-gen05.json` (20-input checkpoint)

**Next Training Run:**
Will start fresh from Gen 0 with 18-input architecture.

## Testing Command:

```bash
cd ai/simple
node self-damage-trainer.js --gen 5 --pop 30 --games 8 --tabs 8
```

**Watch for:**

- `explosionDistance` influence > 60%
- `lastExplosionY` removed from inputs
- Distance-based learning instead of position-based

---

**Status:** ✅ READY - Clean slate with simplified, clearer inputs!
