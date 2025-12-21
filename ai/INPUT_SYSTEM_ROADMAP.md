# 🧠 AI Input System Roadmap

**Date:** December 21, 2025  
**Current Status:** 58 inputs implemented  
**Target Status:** 66 inputs (Phase 1 enhancement)  
**Purpose:** Track all neural network inputs and their verification status

---

## 📊 Current Input Architecture (58 inputs)

### Breakdown by Category:

| Category      | Inputs | Status          | Verified          |
| ------------- | ------ | --------------- | ----------------- |
| Self State    | 3      | ✅ Implemented  | ❓ Pending        |
| Enemy State   | 16     | ✅ Implemented  | ❓ Pending        |
| Weapons       | 3      | ✅ Implemented  | ❓ Pending        |
| Context       | 2      | ✅ Implemented  | ❓ Pending        |
| Ballistics    | 8      | ✅ Implemented  | ❓ Pending        |
| Terrain       | 10     | ✅ Implemented  | ❓ Pending        |
| Obstacles     | 4      | ✅ Implemented  | ❓ Pending        |
| Shot History  | 6      | ✅ Implemented  | ❓ Pending        |
| Shot Feedback | 6      | ✅ Implemented  | ❓ Pending        |
| **TOTAL**     | **58** | **✅ Complete** | **❓ Unverified** |

---

## 📋 Detailed Input Specifications

### 1. Self State (3 inputs)

**Purpose:** AI's own position and health

| #   | Input         | Range | Description                                  | Verification |
| --- | ------------- | ----- | -------------------------------------------- | ------------ |
| 1   | `self.health` | 0-1   | Current health / max health                  | ❓           |
| 2   | `self.x`      | 0-1   | X position normalized to screen width (1200) | ❓           |
| 3   | `self.y`      | 0-1   | Y position normalized to screen height (700) | ❓           |

**Extraction:** `gameState.self`  
**File:** `puppeteer-game-runner.js`

---

### 2. Enemy State (16 inputs = 4 enemies × 4 features)

**Purpose:** Location and threat level of opponents

| #     | Input        | Range  | Description                                   | Verification |
| ----- | ------------ | ------ | --------------------------------------------- | ------------ |
| 4-7   | `enemy[0].*` | varies | First enemy (health, distance, angle, threat) | ❓           |
| 8-11  | `enemy[1].*` | varies | Second enemy                                  | ❓           |
| 12-15 | `enemy[2].*` | varies | Third enemy                                   | ❓           |
| 16-19 | `enemy[3].*` | varies | Fourth enemy (or zeros if <4 enemies)         | ❓           |

**Per-enemy features:**

- `health`: 0-1 (normalized to max health)
- `distance`: 0-1 (capped at 1000 pixels)
- `angle`: 0-1 (from -π to π, normalized)
- `threat`: 0-1 (calculated threat level)

**Extraction:** `gameState.enemies`  
**File:** `puppeteer-game-runner.js`

---

### 3. Weapons (3 inputs)

**Purpose:** Available ammunition

| #   | Input          | Range | Description        | Verification |
| --- | -------------- | ----- | ------------------ | ------------ |
| 20  | `ammo.BAZOOKA` | 0-∞   | Bazooka ammo count | ❓           |
| 21  | `ammo.GRENADE` | 0-∞   | Grenade ammo count | ❓           |
| 22  | `ammo.SHOTGUN` | 0-∞   | Shotgun ammo count | ❓           |

**Extraction:** `gameState.weapons.ammo`  
**File:** `puppeteer-game-runner.js`

---

### 4. Context (2 inputs)

**Purpose:** Game state and timing

| #   | Input           | Range | Description                      | Verification |
| --- | --------------- | ----- | -------------------------------- | ------------ |
| 23  | `turnNumber`    | 0-1   | Current turn / 100 (capped)      | ❓           |
| 24  | `timeRemaining` | 0-1   | Turn time remaining / 30 seconds | ❓           |

**Extraction:** `gameState.context`  
**File:** `puppeteer-game-runner.js`

---

### 5. Ballistics (8 inputs)

**Purpose:** Weapon physics for current shot

| #   | Input                | Range   | Description                               | Verification |
| --- | -------------------- | ------- | ----------------------------------------- | ------------ |
| 25  | `projectileSpeed`    | 0-1     | Normalized velocity (e.g., 800 px/s)      | ❓           |
| 26  | `gravity`            | 0-1     | Gravity effect (normalized)               | ❓           |
| 27  | `timeToImpact`       | 0-1     | Predicted flight time / 5 seconds         | ❓           |
| 28  | `optimalAngle`       | 0-1     | Suggested angle for current distance      | ❓           |
| 29  | `powerNeeded`        | 0-1     | Required shot power                       | ❓           |
| 30  | `windEffect`         | -1 to 1 | Wind influence (if implemented)           | ❓           |
| 31  | `arcHeight`          | 0-1     | Predicted trajectory peak / screen height | ❓           |
| 32  | `collisionPredicted` | 0 or 1  | Will shot hit obstacle?                   | ❓           |

**CRITICAL:** These inputs enable weapon adaptability!  
**Extraction:** `gameState.ballistics`  
**File:** `puppeteer-game-runner.js`  
**Verification Priority:** HIGH

---

### 6. Terrain (10 inputs)

**Purpose:** Height samples along trajectory

| #     | Input          | Range | Description                                   | Verification |
| ----- | -------------- | ----- | --------------------------------------------- | ------------ |
| 33-42 | `terrain[0-9]` | 0-1   | Height at 10 points from AI to target / 700px | ❓           |

**Sampling:** Evenly spaced points along line from self to target  
**Purpose:** Detect hills, platforms, terrain blocking shot  
**Extraction:** `gameState.terrain`  
**File:** `puppeteer-game-runner.js`  
**Verification Priority:** MEDIUM (map generalization depends on this)

---

### 7. Obstacles (4 inputs)

**Purpose:** Static obstacle detection

| #   | Input             | Range   | Description                           | Verification |
| --- | ----------------- | ------- | ------------------------------------- | ------------ |
| 43  | `lineOfSight`     | 0 or 1  | Clear path to target?                 | ❓           |
| 44  | `nearestDistance` | 0-1     | Distance to nearest obstacle / 1000px | ❓           |
| 45  | `obstacleHeight`  | 0-1     | Height of blocking obstacle / 700px   | ❓           |
| 46  | `terrainType`     | 0/0.5/1 | None, soft, or hard terrain           | ❓           |

**Extraction:** `gameState.obstacles`  
**File:** `puppeteer-game-runner.js`

---

### 8. Shot History (6 inputs = 2 shots × 3 features)

**Purpose:** Learn from previous attempts

| #     | Input          | Range  | Description                           | Verification |
| ----- | -------------- | ------ | ------------------------------------- | ------------ |
| 47-49 | `history[0].*` | varies | Most recent shot (hit, damage, error) | ❓           |
| 50-52 | `history[1].*` | varies | 2nd most recent shot                  | ❓           |

**Per-shot features:**

- `hit`: 0 or 1 (did shot hit?)
- `damage`: 0-1 (damage dealt / 100)
- `distanceError`: 0-1 (miss distance / 500px)

**Purpose:** Enables aim correction learning  
**Extraction:** `gameState.shotHistory`  
**File:** `puppeteer-game-runner.js`  
**Verification Priority:** HIGH (spatial learning depends on this)

---

### 9. Shot Feedback (6 inputs)

**Purpose:** Immediate turn-to-turn learning signals

| #   | Input              | Range   | Description               | Verification |
| --- | ------------------ | ------- | ------------------------- | ------------ |
| 53  | `didDamageEnemy`   | 0 or 1  | Hit enemy last turn?      | ❓           |
| 54  | `damageDealt`      | 0-1     | Enemy damage / 100        | ❓           |
| 55  | `didDamageSelf`    | 0 or 1  | Self-damage last turn?    | ❓           |
| 56  | `damageTaken`      | 0-1     | Self-damage / 100         | ❓           |
| 57  | `myHealthDelta`    | -1 to 1 | My health change / 100    | ❓           |
| 58  | `enemyHealthDelta` | -1 to 1 | Enemy health change / 100 | ❓           |

**CRITICAL:** These enable cause-effect learning!  
**Purpose:** AI understands "good shot" vs "bad shot"  
**Extraction:** `gameState.shotFeedback`  
**File:** `puppeteer-game-runner.js`  
**Verification Priority:** CRITICAL

---

## 🚀 Phase 1 Enhancement: Temporal Obstacles (8 NEW inputs)

**Status:** Planned (not yet implemented)  
**Priority:** CRITICAL for Hotel of Horror map

### 10. Temporal Obstacles (8 new inputs → Total: 66)

**Purpose:** Moving obstacle awareness and timing

| #   | Input                  | Range   | Description                         | Implementation |
| --- | ---------------------- | ------- | ----------------------------------- | -------------- |
| 59  | `hasMovingObstacle`    | 0 or 1  | Moving obstacles in trajectory?     | ⏳ Pending     |
| 60  | `obstacleVelocityX`    | -1 to 1 | Horizontal velocity (normalized)    | ⏳ Pending     |
| 61  | `obstacleVelocityY`    | -1 to 1 | Vertical velocity (normalized)      | ⏳ Pending     |
| 62  | `obstaclePhase`        | 0-1     | Position in movement cycle          | ⏳ Pending     |
| 63  | `timeToCollision`      | 0-1     | When will obstacle block shot?      | ⏳ Pending     |
| 64  | `predictedClearWindow` | 0-1     | When will path be clear?            | ⏳ Pending     |
| 65  | `movementPattern`      | 0-1     | Pattern type (static/linear/cyclic) | ⏳ Pending     |
| 66  | `optimalShotDelay`     | 0-1     | Recommended wait time               | ⏳ Pending     |

**Why critical:**

- Hotel of Horror has moving elevators
- Current AI blind to timing requirements
- Perfect aim still misses if elevator blocks path
- With these inputs: AI learns "when to shoot" not just "where"

**Implementation:**

1. Track decoration/platform velocities in game
2. Predict obstacle positions during projectile flight
3. Calculate collision times
4. Suggest optimal timing windows

**Expected Impact:** 20-30% fitness improvement on maps with moving obstacles

---

## ✅ Verification Checklist

**Goal:** Confirm all inputs contain meaningful data

### Phase 1: Data Extraction Verification

**For each input category, verify:**

- [ ] **Self State:** Non-zero health, positions change per turn
- [ ] **Enemy State:** Multiple enemies detected, distances/angles reasonable
- [ ] **Weapons:** Ammo counts match game state
- [ ] **Context:** Turn numbers increment, time decreases
- [ ] **Ballistics:** Values change per weapon type
- [ ] **Terrain:** Heights vary by map
- [ ] **Obstacles:** Line of sight correlates with terrain
- [ ] **Shot History:** Distance errors on misses are non-zero
- [ ] **Shot Feedback:** Damage flags correlate with actual damage

### Phase 2: Learning Signal Verification

**Confirm AI learns from inputs:**

- [ ] **Aim Correction:** Chosen angles converge toward `optimalAngle`
- [ ] **Self-Damage Avoidance:** `didDamageSelf` → avoid similar angles
- [ ] **Hit Rate Improvement:** `distanceError` decreases over generations
- [ ] **Terrain Awareness:** AI adapts shots to terrain heights
- [ ] **Weapon Selection:** AI uses different weapons appropriately

### Phase 3: Generalization Verification

**Confirm inputs enable map-independent learning:**

- [ ] **Map Rotation:** Terrain inputs vary by map
- [ ] **Config Changes:** Ballistics update with weapon modifications
- [ ] **Obstacle Adaptation:** AI handles different obstacle layouts
- [ ] **Temporal Obstacles:** AI learns timing on Hotel of Horror

---

## 📊 Verification Methodology

### 1. Add Debug Logging

**Implement `--debug` flag that logs all inputs per turn:**

```javascript
if (options.debug) {
  console.log("🧠 AI Inputs:", {
    generation: currentGen,
    network: networkId,
    turn: turnNumber,
    inputs: {
      self: [health, x, y],
      enemies: [...enemyInputs],
      ballistics: { ...ballisticsInputs },
      // ... all 58 inputs
    },
  });
}
```

### 2. Statistical Analysis

**Run analysis script on debug logs:**

```bash
node training/analyze-logs.js --verify-inputs
```

**Checks:**

- Non-zero value count per input
- Value range verification (0-1 for normalized, etc.)
- Correlation analysis (does `didDamageEnemy` correlate with fitness?)
- Temporal patterns (do values change appropriately?)

### 3. Visual Inspection

**Create visualizations:**

- Input value distributions over time
- Angle convergence toward optimal
- Distance error reduction over generations
- Fitness correlation heatmap

---

## 🎯 Success Criteria

**For input system to be considered "verified":**

✅ **All 66 inputs (after Phase 1):**

- Contain non-zero meaningful values
- Ranges match specifications
- Update correctly per game state

✅ **Learning signals work:**

- High fitness correlates with good inputs (hits, low self-damage)
- Low fitness correlates with bad inputs (misses, high self-damage)
- AI improves over generations using these signals

✅ **Generalization works:**

- Same AI works on 4 different maps
- AI adapts to weapon config changes
- AI handles moving obstacles (after temporal inputs added)

---

## 📅 Implementation Timeline

**Current Status:** 58 inputs defined, extraction status unknown

### Immediate (After baseline test):

1. Add comprehensive logging (all 58 inputs)
2. Run 5-gen test with logging enabled
3. Analyze logs to identify missing/incorrect extractions

### Phase 1 (1.5 hours):

1. Fix any extraction issues found
2. Add 8 temporal obstacle inputs
3. Update network architecture (58 → 66)

### Phase 2 (1 hour):

1. Run validation with all 66 inputs
2. Verify all inputs meaningful
3. Confirm learning signals work

### Phase 3 (Ongoing):

1. Continuous monitoring during extended training
2. Periodic verification of input quality
3. Refinement based on results

---

## 🔮 Future Enhancements (Beyond 66 inputs)

**Potential additions for future phases:**

### Weather Effects (4 inputs)

- Wind speed/direction
- Rain intensity
- Fog visibility
- Impact on ballistics

### Team Coordination (6 inputs)

- Teammate positions
- Teammate health
- Teammate target selections
- Team strategy signals

### Advanced Tactics (8 inputs)

- Cover availability
- Flanking opportunities
- High ground advantage
- Retreat path analysis

### Opponent Modeling (10 inputs)

- Enemy behavior patterns
- Enemy accuracy statistics
- Enemy weapon preferences
- Predicted enemy next move

**Total Potential:** 66 + 28 = 94 inputs (for future consideration)

---

## 📞 References

**Related Documents:**

- `NEXT_PHASE_ENHANCEMENTS.md` - Implementation roadmap
- `network-config.js` - Input specifications in code
- `TRAINING_ANALYSIS_REPORT.md` - Baseline training results
- `FIXES_APPLIED_SUMMARY.md` - Completed stability fixes

**For questions about:**

- Input definitions → See `network-config.js`
- Input extraction → See `puppeteer-game-runner.js`
- Input verification → See this document
- Enhancement timeline → See `NEXT_PHASE_ENHANCEMENTS.md`

---

**Last Updated:** December 21, 2025  
**Next Review:** After Phase 1 implementation  
**Status:** Living document - will be updated as inputs are verified
