# 🚀 Next Phase Enhancements - AI Training System

**Date:** December 21, 2025, 1:04 PM  
**Status:** Roadmap - Pending baseline test completion  
**Current Progress:** Baseline 5-generation test running (~15% complete)

---

## 📊 Current State

### ✅ Completed (Phase 0)

**Training System Stability:**

1. ✅ Browser restart every 20 games (prevents Gen 6 crash)
2. ✅ Error detection and retry logic (catches failures early)
3. ✅ Simplified model export (one `best-ai.json` output)
4. ✅ All critical bug fixes applied to trainer.js

**Status:** Baseline 5-generation test running to validate fixes

### 🏃 In Progress

**Baseline Validation Run:**

- Command: `node training/trainer.js --generations 5 --population 10 --headless`
- Purpose: Verify stability fixes work
- Expected completion: ~40 minutes from start
- Success criteria: All 5 generations complete, browser restarts visible, fitness > 0

---

## 🎯 Phase 1: Core Input System Enhancements

**Priority:** CRITICAL  
**Time Estimate:** 1.5 hours  
**Dependencies:** Baseline test must complete first

### A. Map Rotation System (30 minutes)

**Problem:** Currently training on single map (hotelOfHorror only)

- AI learns map-specific patterns, not general strategies
- Won't transfer to other maps

**Solution:** Randomize map selection per game

```javascript
const MAPS = ["hotelOfHorror", "dinocoaster", "heavyMetalCoaster", "magnificentBulk"];
const randomMap = MAPS[Math.floor(Math.random() * MAPS.length)];
```

**Implementation:**

- File: `ai/training/puppeteer-game-runner.js`
- Add `selectRandomMap()` method
- Use in `startNewGame()`
- Log selected map per game

**Expected Impact:**

- AI learns general strategies applicable to all maps
- Fitness may initially decrease (learning harder)
- Long-term: More robust, generalizable AI

---

### B. Temporal Obstacle Tracking (45 minutes)

**Problem:** AI blind to moving obstacles (Hotel of Horror elevators)

- No awareness of obstacle velocity or movement
- Can't learn shot timing
- Perfect aim still misses if elevator blocks path

**Solution:** Add 8 new inputs for dynamic obstacles

**New Inputs:**

```javascript
temporalObstacles: 8; // NEW - moving object awareness
```

1. `hasMovingObstacle`: 0/1 - Moving obstacles in trajectory?
2. `obstacleVelocityX`: -1 to 1 - Horizontal velocity (normalized)
3. `obstacleVelocityY`: -1 to 1 - Vertical velocity (normalized)
4. `obstaclePhase`: 0-1 - Position in movement cycle
5. `timeToCollision`: 0-1 - Will obstacle block shot? When?
6. `predictedClearWindow`: 0-1 - When will path be clear?
7. `movementPattern`: 0/0.33/0.66/1 - Pattern type (static/linear/cyclic/random)
8. `optimalShotDelay`: 0-1 - Recommended wait time

**Implementation:**

- File: `ai/training/network-config.js` - Update input schema (58 → 66)
- File: `ai/training/puppeteer-game-runner.js` - Extract obstacle motion data
- File: `ai/training/trainer.js` - Update network architecture

**Expected Impact:**

- AI learns "when to shoot" not just "where to shoot"
- Handles moving obstacles intelligently
- 20-30% fitness improvement on dynamic maps

---

### C. Comprehensive Logging System (30 minutes)

**Problem:** Can't verify if AI receives correct data

- Don't know if terrain data is extracted
- Don't know if ballistics are calculated
- Don't know if shot feedback is accurate

**Solution:** Add verbose debug logging

**Logging Categories:**

**1. Shot Feedback Verification:**

```javascript
console.log("🎯 Shot Feedback:", {
  didDamageEnemy: shotFeedback.didDamageEnemy,
  damageDealt: shotFeedback.damageDealt,
  didDamageSelf: shotFeedback.didDamageSelf,
  damageTaken: shotFeedback.damageTaken,
  myHealthDelta: shotFeedback.myHealthDelta,
  enemyHealthDelta: shotFeedback.enemyHealthDelta,
});
```

**2. Ballistics Data Verification:**

```javascript
console.log("🚀 Weapon Physics:", {
  weaponType: decision.weapon,
  projectileSpeed: ballistics.projectileSpeed,
  timeToImpact: ballistics.timeToImpact,
  optimalAngle: ballistics.optimalAngle,
  chosenAngle: decision.aimAngle,
  angleError: Math.abs(decision.aimAngle - ballistics.optimalAngle),
});
```

**3. Spatial Data Verification:**

```javascript
console.log("📍 Spatial Data:", {
  selfPosition: { x: gameState.self.x, y: gameState.self.y },
  enemyPosition: { x: enemy.x, y: enemy.y },
  distance: enemy.distance,
  distanceError: shotHistory.distanceError,
  aimAngle: decision.aimAngle,
});
```

**4. Terrain & Obstacles:**

```javascript
console.log("🗻 Environment:", {
  mapName: currentMap,
  terrainHeights: gameState.terrain,
  obstacles: gameState.obstacles,
  lineOfSight: gameState.obstacles?.lineOfSight,
  movingObstacles: gameState.temporalObstacles,
});
```

**5. Learning Signals:**

```javascript
console.log("🧠 Learning:", {
  fitnessGained: calculatedFitness,
  wasGoodShot: damageDealt > 30 && damageTaken === 0,
  wasBadShot: damageTaken > 20 || (damageDealt === 0 && distanceError > 0.5),
  reason: determineReason(shotResult),
});
```

**Implementation:**

- Add `--debug` flag to training command
- Export logs to JSON file: `ai/training-logs/debug-gen${N}.json`
- Create log analysis script: `ai/training/analyze-logs.js`

**Expected Impact:**

- Can verify all inputs are meaningful
- Identify missing/incorrect data extraction
- Prove AI is learning from correct signals

---

### D. Network Architecture Update (15 minutes)

**Change:** 58 inputs → 66 inputs (add 8 temporal obstacle inputs)

**Files to update:**

- `ai/training/network-config.js`: Update `inputs: 66`
- `ai/training/network-config.js`: Add `temporalObstacles` schema
- `ai/training/trainer.js`: Update initial network creation

**Validation:**

- Verify old checkpoints incompatible (expected)
- Verify new networks initialize correctly
- Verify all 66 inputs used during training

---

## 🧪 Phase 2: Validation & Verification

**Priority:** HIGH  
**Time Estimate:** 1-1.5 hours  
**Dependencies:** Phase 1 complete

### Test Run: 5 Generations with All Enhancements

**Command:**

```bash
cd ai
node training/trainer.js --generations 5 --population 10 --headless --debug
```

### Success Criteria:

**1. Map Rotation Working:**

- ✅ See 4 different map names in logs
- ✅ Terrain heights vary by map
- ✅ Fitness distributed across maps

**2. Temporal Obstacles Tracked:**

- ✅ `hasMovingObstacle=1` on Hotel of Horror
- ✅ Non-zero velocities on moving elevators
- ✅ `timeToCollision` changes over time

**3. Ballistics Data Present:**

- ✅ `projectileSpeed` changes per weapon
- ✅ `optimalAngle` varies with distance
- ✅ AI's angles converge toward optimal over gens

**4. Shot Feedback Accurate:**

- ✅ `didDamageEnemy` correlates with hits
- ✅ `didDamageSelf` flags self-damage correctly
- ✅ Distance errors reasonable (0-1 range)

**5. Learning Signals Clear:**

- ✅ High fitness correlates with good shots
- ✅ Low fitness correlates with bad shots/self-damage
- ✅ AI improves aim over generations

**6. System Stability:**

- ✅ All 5 generations complete
- ✅ Browser restarts at games 20, 40, 60, etc.
- ✅ No crashes or errors
- ✅ Model exported successfully

---

## 📊 Phase 3: Analysis & Documentation

**Priority:** MEDIUM  
**Time Estimate:** 30-45 minutes  
**Dependencies:** Phase 2 validation run complete

### A. Log Analysis

**Process:**

1. Run `node training/analyze-logs.js --generation all`
2. Generate visualizations:
   - Input value distributions (all 66 inputs)
   - Fitness progression over generations
   - Aim accuracy improvement over time
   - Angle error vs optimal angle convergence

**Deliverables:**

- `ai/logs/input-analysis.json` - Statistical summary
- `ai/logs/learning-curves.png` - Visualization
- `ai/logs/verification-report.txt` - Pass/fail per input

### B. Documentation Creation

**Create new documents:**

**1. INPUT_VERIFICATION_REPORT.md**

- All 66 inputs listed
- Data ranges observed
- Verification status (✅/❌)
- Issues found and resolved

**2. TRAINING_VALIDATION_RESULTS.md**

- Baseline vs Enhanced comparison
- Fitness improvements
- Learning rate analysis
- Map generalization metrics

**3. ENHANCEMENT_IMPACT_SUMMARY.md**

- What was added and why
- Measured improvements
- Remaining limitations
- Future work

---

## 🚀 Phase 4: Extended Production Training

**Priority:** MEDIUM  
**Time Estimate:** 3-4 hours  
**Dependencies:** Phase 3 analysis shows positive results

### Production Training Run

**Command:**

```bash
cd ai
node training/trainer.js --generations 20 --population 20 --headless
```

**Characteristics:**

- Larger population (20 networks)
- More generations (20)
- All enhancements active
- Maps rotating
- ~800 total games
- ~3-4 hours total time

### Expected Outcomes:

**Gen 1-5:** Exploration phase

- Wide variety of behaviors
- Fitness: 600-1000 range
- High variance

**Gen 6-10:** Convergence begins

- Elites stabilize
- Fitness: 800-1200 range
- Lower variance

**Gen 11-15:** Optimization

- Fine-tuning behaviors
- Fitness: 1000-1500 range
- Consistent performance

**Gen 16-20:** Mastery

- Near-optimal play
- Fitness: 1200-1800 range
- Handles all maps well

### Post-Training Validation:

**Test the final `best-ai.json` on:**

**1. All Maps:**

- Hotel of Horror (moving obstacles)
- Dinocoaster (terrain variety)
- Heavy Metal Coaster (complex geometry)
- Magnificent Bulk (different layout)

**2. Config Changes:**

- Increase bazooka speed +50%
- Decrease grenade arc -30%
- Add wind effects
- Verify AI adapts to changes

**3. Opponent Variety:**

- vs Random AI (easy)
- vs Rule-based AI (medium)
- vs Previous best-ai.json (hard)
- vs Self (ultimate test)

---

## 📋 Implementation Checklist

### Phase 1: Core Enhancements

- [ ] Implement map rotation in puppeteer-game-runner.js
- [ ] Add 8 temporal obstacle inputs to network-config.js
- [ ] Extract obstacle motion data in puppeteer-game-runner.js
- [ ] Add comprehensive logging system with --debug flag
- [ ] Update network architecture to 66 inputs
- [ ] Create log export functionality
- [ ] Write analyze-logs.js script

### Phase 2: Validation

- [ ] Run 5-gen test with all enhancements
- [ ] Verify map rotation logs
- [ ] Verify temporal obstacle data
- [ ] Verify ballistics data
- [ ] Verify shot feedback accuracy
- [ ] Verify learning signals
- [ ] Confirm system stability

### Phase 3: Analysis

- [ ] Analyze debug logs
- [ ] Generate visualizations
- [ ] Create INPUT_VERIFICATION_REPORT.md
- [ ] Create TRAINING_VALIDATION_RESULTS.md
- [ ] Create ENHANCEMENT_IMPACT_SUMMARY.md
- [ ] Review and approve for production

### Phase 4: Production

- [ ] Run 20-generation extended training
- [ ] Monitor progress and fitness curves
- [ ] Test exported AI on all maps
- [ ] Test AI with config changes
- [ ] Document final results
- [ ] Archive successful training run

---

## 🎯 Success Metrics Summary

**For the enhancement effort to be considered successful:**

✅ **Technical Metrics:**

- All 66 inputs contain meaningful data (verified via logging)
- AI adapts to 4 different maps (fitness consistent across maps)
- AI handles moving obstacles (timing learned on Hotel of Horror)
- AI uses ballistics data (angle convergence toward optimal)
- Training completes 20 generations without crashes

✅ **Performance Metrics:**

- Fitness improves generation over generation
- Final fitness > 1500 (vs baseline ~800)
- Win rate > 60% against random opponents
- Adapts to config changes within 2-3 games

✅ **Learning Metrics:**

- Angle error decreases over time
- Self-damage decreases over time
- Hit rate increases over time
- Consistent behavior across maps

---

## ⏱️ Timeline Summary

**Total Time Investment:** ~7-8 hours

| Phase          | Time      | Activities                          |
| -------------- | --------- | ----------------------------------- |
| Phase 0 (Done) | 2 hours   | Fix stability issues, baseline test |
| Phase 1        | 1.5 hours | Implement all enhancements          |
| Phase 2        | 1 hour    | Validation run with logging         |
| Phase 3        | 0.5 hours | Analysis and documentation          |
| Phase 4        | 3-4 hours | Extended production training        |

**Deliverable:** Robust, generalizable AI that works on any map with any weapon configuration!

---

## 🚧 Known Limitations & Future Work

**After all phases complete, remaining limitations:**

1. **Weather Effects:** No inputs for rain, wind, fog
2. **Team Strategy:** No coordination with teammates
3. **Power-ups:** No awareness of health packs, ammo crates
4. **Advanced Tactics:** No cover seeking, flanking strategies
5. **Opponent Modeling:** No prediction of enemy behavior

**These can be addressed in future enhancement cycles!**

---

## 📞 Contact & Support

**Questions about enhancements?**

- Review this document first
- Check INPUT_SYSTEM_ROADMAP.md for input details
- See FIXES_APPLIED_SUMMARY.md for completed work
- See TRAINING_ANALYSIS_REPORT.md for baseline results

**Ready to implement?** Toggle to Act Mode and let's build this! 🚀
