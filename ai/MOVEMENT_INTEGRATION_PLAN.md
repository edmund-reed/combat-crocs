# Movement Integration Plan

## AI Training System Phase 2: Movement + Positioning

**Created:** December 28, 2024  
**Status:** 🚧 Planning Phase  
**Goal:** Teach AI to move, jump, and position before shooting to achieve human-level gameplay

---

## 📋 Executive Summary

**Current System:** AI can aim and avoid self-damage (12.8 HP avg, 79 HP enemy damage)  
**Limitation:** Cannot move to find better positions - stuck in spawn location  
**Solution:** Add continuous movement control with assistance system (similar to look-ahead for aiming)

**Success Criteria:**

- Phase 1: AI moves toward enemy 60%+ of time before shooting
- Phase 2: AI uses jumps to reach platforms 40%+ of time
- Phase 3: AI masters complex movement (friction climbing, timing)
- Phase 4: Win 40%+ against intermediate human players

---

## 🧠 Network Architecture

### **Current (Aiming Only)**

- **Inputs:** 25 (health, enemy position, terrain raycasting, etc.)
- **Outputs:** 3 (actionType, movementDistance, aimAngle)
- **Behavior:** Single decision → shoot → turn end

### **New (Movement + Aiming)**

- **Inputs:** 28 (added: canReachEnemy, timeRemaining, distToBestPosition)
- **Outputs:** 4 (action, moveDirection, shouldJump, aimAngle)
- **Behavior:** Continuous loop → move/jump/shoot decisions every 150ms

---

## 📥 Input Encoding (28 Total)

### **Existing Inputs (25)** - Keep as-is

```javascript
// Self State (6)
healthPercent, maxHealth, selfX, selfY, selfTeam, facingLeft;

// Enemy State (8)
enemyHealthPercent, enemyDistance, enemyAngle, enemyX, enemyY, enemyAboveMe, enemyBelowMe, enemyThreat;

// Terrain Raycasting (8 directions, 1400px range)
terrainUp,
  terrainDown,
  terrainLeft,
  terrainRight,
  terrainUpLeft,
  terrainUpRight,
  terrainDownLeft,
  terrainDownRight;

// Shot Feedback (3)
didHitEnemy, didHitSelf, explosionDistFromEnemy;
```

### **New Inputs (3)** - Added for movement

```javascript
// Position Evaluation
canReachEnemyFromHere (0/1)
  ↳ Can any of 37 angles hit enemy from current position?
  ↳ Calculated using look-ahead simulation
  ↳ Guides "move vs shoot" decision

timeRemainingInTurn (0-1)
  ↳ Normalized 30-second turn timer
  ↳ Prevents wasting time at end of turn
  ↳ (30 - elapsed) / 30

distanceToBestPosition (0-1)
  ↳ How far from assistance's recommended position?
  ↳ Normalized by map width (1200px)
  ↳ Guides movement direction
```

**Total:** 28 inputs → Network

---

## 📤 Output Encoding (4 Total)

### **1. Action Decision** (0-1)

```javascript
output[0] → action

if (action < 0.5) {
  // KEEP MOVING - Don't shoot yet, keep positioning
  executeMovement(moveDirection, shouldJump);
} else {
  // STOP AND SHOOT - Fire from current position
  executeShot(aimAngle);
  endTurn();
}
```

### **2. Movement Direction** (-1 to +1)

```javascript
output[1] → moveDirection

if (moveDirection < -0.3) {
  holdLeftButton();
} else if (moveDirection > 0.3) {
  holdRightButton();
} else {
  releaseMovementButtons();
}
```

### **3. Jump Control** (0-1)

```javascript
output[2] → shouldJump

if (shouldJump >= 0.5 && canJumpNow()) {
  pressJumpButton();
}
```

### **4. Aim Angle** (0-1, mapped to 0-2π)

```javascript
output[3] → aimAngle

// Only used when action >= 0.5 (shooting)
const radians = aimAngle * 2 * Math.PI;
```

---

## 🤝 Assistance System

### **Position Evaluator**

Finds best position to shoot from (similar to look-ahead for aiming)

```javascript
function findBestPositionToShoot(playerPos, enemyPos, scene) {
  // 1. Generate candidate positions (grid search)
  const candidates = [];
  for (let dx = -500; dx <= 500; dx += 100) {
    // Every 100px
    for (let dy = -200; dy <= 200; dy += 100) {
      candidates.push({
        x: playerPos.x + dx,
        y: playerPos.y + dy,
      });
    }
  }

  // 2. Score each position
  let bestPos = null;
  let bestScore = -Infinity;

  for (const pos of candidates) {
    // Skip if inside terrain
    if (isInsideTerrain(pos, scene)) continue;

    // Check if we can hit enemy from this position
    const canHit = checkIfPositionCanHitEnemy(pos, enemyPos, scene);
    if (!canHit) continue;

    // Score based on:
    // - Distance to enemy (sweet spot: 200-600px)
    // - Safety (not too close, not too far)
    const dist = distance(pos, enemyPos);
    const score =
      dist > 200 && dist < 600
        ? 1000 - Math.abs(dist - 400) // Prefer ~400px distance
        : -dist;

    if (score > bestScore) {
      bestScore = score;
      bestPos = pos;
    }
  }

  return bestPos; // Best position to move to
}
```

### **Can Hit Check** (Reuse Look-Ahead Logic)

```javascript
function checkIfPositionCanHitEnemy(pos, enemyPos, scene) {
  // Test all 37 angles from this position
  for (let i = 0; i < 37; i++) {
    const angle = (i * 10 * Math.PI) / 180;

    // Use InstantShotResolver to simulate shot
    const landing = InstantShotResolver.resolveBazookaFromAngle(
      scene,
      pos,
      angle,
      true, // noDamage simulation
    );

    // Check if explosion would hit enemy
    const distToEnemy = distance(landing, enemyPos);
    const withinRadius = distToEnemy <= DAMAGE_RADIUS;
    const clearLOS = !isExplosionBlocked(landing, enemyPos, scene);

    if (withinRadius && clearLOS) {
      return true; // Found a valid shot!
    }
  }

  return false; // No valid shots from this position
}
```

---

## 🎮 Continuous Decision Loop

### **Turn Structure**

```javascript
async executeAITurn() {
  const DECISION_INTERVAL = 150;  // ms - decide every 150ms
  const TURN_TIME_LIMIT = 30000;  // ms - 30 second turn

  let elapsedTime = 0;
  let hasFiredShot = false;

  // Find best position using assistance
  const bestPosition = findBestPositionToShoot(
    currentPlayerPos,
    enemyPos,
    scene
  );

  while (!hasFiredShot && elapsedTime < TURN_TIME_LIMIT) {
    // 1. Capture current game state
    const gameState = {
      ...existingInputs,
      canReachEnemyFromHere: checkIfPositionCanHitEnemy(
        currentPlayerPos, enemyPos, scene
      ),
      timeRemainingInTurn: (TURN_TIME_LIMIT - elapsedTime) / TURN_TIME_LIMIT,
      distanceToBestPosition: bestPosition
        ? distance(currentPlayerPos, bestPosition) / 1200
        : 1.0,
    };

    // 2. Network makes decision
    const decision = await makeAIDecision(gameState);

    // 3. Execute decision
    if (decision.action >= 0.5) {
      // SHOOT - end turn
      await executeShot(decision.aimAngle);
      hasFiredShot = true;
    } else {
      // KEEP MOVING
      await applyMovementControls({
        left: decision.moveDirection < -0.3,
        right: decision.moveDirection > 0.3,
        jump: decision.shouldJump >= 0.5,
      }, DECISION_INTERVAL);

      // Update player position for next iteration
      await waitForPhysicsToSettle(DECISION_INTERVAL);
      currentPlayerPos = getPlayerPosition();
      elapsedTime += DECISION_INTERVAL;
    }
  }

  // Timeout - force shot if no decision made
  if (!hasFiredShot) {
    await executeShot(decision.aimAngle);
  }
}
```

### **Movement Control Application**

```javascript
async function applyMovementControls(controls, durationMs) {
  // Set button states in browser
  await page.evaluate(ctrl => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const cursors = scene.cursors;
    const spaceKey = scene.spaceKey;

    // Simulate holding buttons
    cursors.left.isDown = ctrl.left;
    cursors.right.isDown = ctrl.right;
    spaceKey.isDown = ctrl.jump;

    // Movement manager will apply these in next update cycle
  }, controls);

  // Wait for physics to process movement
  await delay(durationMs);

  // Release buttons
  await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    scene.cursors.left.isDown = false;
    scene.cursors.right.isDown = false;
    scene.spaceKey.isDown = false;
  });
}
```

---

## 💯 Fitness Function (Updated)

### **Existing Components** (Keep as-is)

```javascript
let fitness = 100; // Base survival

// Self-damage penalty (already balanced)
fitness -= selfDamage * 8; // -384 for 48 HP

// Enemy damage reward (already balanced)
fitness += enemyDamageDealt * 4; // +276 for 69 HP

// Angle accuracy (supervised learning)
fitness += angleAccuracyBonus; // 0-600 points
```

### **New Components** (Movement)

```javascript
// POSITIONING QUALITY
if (shotFiredFrom_canHitPosition) {
  fitness += 200;  // Reward shooting from positions that CAN hit
} else {
  fitness -= 100;  // Penalty for shooting from bad position
}

// MOVEMENT EFFICIENCY
const movementTime = elapsedTime - shootingTime;
if (movementTime < 5000 && shotSuccessful) {
  fitness += 150;  // Quick, effective positioning
} else if (movementTime > 20000) {
  fitness -= 50;   // Took too long to position
}

// ASSISTED MOVEMENT (Supervised Learning)
if (bestPosition) {
  const startDist = distance(startPos, bestPosition);
  const endDist = distance(finalPos, bestPosition);

  if (endDist < startDist) {
    // Moved toward recommended position
    const improvement = (startDist - endDist) / 1200;  // Normalized
    fitness += improvement * 300;  // Up to 300 points
  }

  if (endDist < 100) {
    // Reached the recommended position!
    fitness += 200;
  }
}

// STUCK DETECTION
if (wasStuckInPlace > 2000ms) {
  fitness -= 75;  // Penalty for not moving when stuck
}
```

### **Total Fitness Range**

- **Minimum:** ~-1000 (max self-damage, no hits, bad movement)
- **Typical:** 400-800 (mixed performance)
- **Maximum:** ~2000+ (perfect: no self-damage, high enemy damage, good positioning, angle accuracy)

---

## 🚀 Implementation Roadmap

### **Phase 1: Horizontal Movement** (Week 1)

**Goal:** AI learns to move left/right to find shooting positions

#### **Changes Required:**

1. **Network Architecture**

   - Update outputs: 3 → 4 (add action, moveDirection, jump)
   - Update inputs: 25 → 28 (add canReach, timeRemaining, distToBest)
   - File: `ai/training/input-encoder.js`

2. **Assistance System**

   - Create `findBestPositionToShoot()` function
   - Create `checkIfPositionCanHitEnemy()` function
   - File: `ai/training/browser-injections.js`

3. **Decision Loop**

   - Implement continuous 150ms loop in `executeAITurn()`
   - Add movement control application
   - **Disable jump** (set shouldJump to always < 0.5)
   - File: `ai/training/puppeteer-game-runner.js`

4. **Fitness Function**
   - Add positioning quality bonus/penalty
   - Add assisted movement bonus
   - Add movement efficiency scoring
   - File: `ai/training/fitness-calculator.js`

#### **Training Parameters:**

```bash
node self-damage-trainer.js \
  --pop 15 \
  --gen 20 \
  --games 3 \
  --tabs 1 \
  --instant-shot
```

#### **Success Metrics:**

- Network moves before shooting: 60%+ of games
- Reaches "can hit" positions: 40%+ of time
- Self-damage remains: <15 HP average
- Movement efficiency: <10 seconds avg positioning time

---

### **Phase 2: Add Jumping** (Week 2)

**Goal:** AI learns when to jump (obstacles, platforms, elevation)

#### **Changes Required:**

1. **Enable Jump**

   - Remove jump disable from Phase 1
   - Network can now output shouldJump >= 0.5

2. **Jump Assistance**

   - Update `findBestPositionToShoot()` to consider elevated positions
   - Add terrain height detection to position scoring
   - Prioritize positions that require jumping (platforms, high ground)

3. **Fitness Updates**
   - Bonus for reaching elevated positions (if beneficial)
   - Penalty for wasted jumps (jumping when not needed)

#### **Training Parameters:**

```bash
node self-damage-trainer.js \
  --pop 15 \
  --gen 30 \
  --games 4 \
  --tabs 1 \
  --instant-shot
```

#### **Success Metrics:**

- Successfully jumps to platforms: 40%+ of time when needed
- Jump timing improves (fewer missed jumps)
- Can reach positions unreachable without jumping
- Self-damage remains: <15 HP average

---

### **Phase 3: Complex Movement** (Week 3)

**Goal:** Master advanced techniques (friction climbing, repeated jumps, timing)

#### **Changes Required:**

1. **Movement History**

   - Add last 5 decisions to input encoding
   - Helps network learn sequences (jump → hold right → jump again)
   - Inputs: 28 → 33 (add 5 history slots)

2. **Stuck Detection**

   - Track position changes over time
   - If < 50px movement in 2 seconds → stuck
   - Add "isStuck" input to network
   - Inputs: 33 → 34

3. **Escape Behaviors**

   - If stuck, assistance suggests alternative approaches
   - Try jumping in place
   - Try opposite direction
   - Try different jump timing

4. **Fitness Refinement**
   - Larger bonus for reaching difficult positions
   - Reward "progress toward goal" even if not reaching it

#### **Training Parameters:**

```bash
node self-damage-trainer.js \
  --pop 20 \
  --gen 50 \
  --games 5 \
  --tabs 1 \
  --instant-shot
```

#### **Success Metrics:**

- Reaches difficult positions: 30%+ of time
- Uses friction climbing when appropriate
- Adapts when stuck (tries alternatives)
- Mastery of jump timing and sequences

---

### **Phase 4: Integration & Polish** (Week 4)

**Goal:** Balance movement + aiming for human-competitive play

#### **Changes Required:**

1. **Fine-Tuning**

   - Adjust all fitness weights for balance
   - Ensure movement doesn't overshadow aiming quality
   - Maintain self-damage avoidance (<10 HP avg)

2. **Strategic Depth**

   - Add "retreat" behavior (move away if low health)
   - Add "rush" behavior (move close if high health advantage)
   - Context-aware positioning

3. **Real-Time Play**
   - Test against human players
   - Gather feedback on AI behavior
   - Identify weaknesses and retrain

#### **Training Parameters:**

```bash
node self-damage-trainer.js \
  --pop 25 \
  --gen 100 \
  --games 6 \
  --tabs 2 \
  --instant-shot
```

#### **Success Metrics:**

- Win rate vs intermediate humans: 40%+
- Balanced performance: movement + aiming + survival
- Consistent behavior across different maps
- Self-damage: <10 HP average
- Network win rate: 60%+ (angle prediction accuracy)

---

## 📊 Monitoring & Debugging

### **Key Metrics to Track**

```javascript
// Per Generation
-avgMovementTime - // How long spent positioning
  avgDistanceMoved - // Total movement distance
  positionQualityScore - // % shots from "can hit" positions
  jumpSuccessRate - // % jumps that reached intended target
  stuckRate - // % games where AI got stuck
  // Overall Training
  networkWinRate - // % time network beats look-ahead
  selfDamageProgression - // Tracking over generations
  movementEfficiency; // Movement time vs shot quality
```

### **Debug Visualization**

```javascript
// In headed mode, show:
- Best position marker (red X)
- Current distance to best (line)
- "Can hit from here" indicator (green/red circle)
- Jump trajectory preview
- Movement path history (last 10 positions)
```

---

## 🔧 File Changes Summary

### **New Files**

- `ai/training/movement-assistance.js` - Position evaluator, can-hit checker
- `ai/training/movement-simulator.js` - Physics-based movement prediction

### **Modified Files**

1. **`ai/training/input-encoder.js`**

   - Add 3 new inputs (canReach, timeRemaining, distToBest)
   - Update encoding function to 28 inputs

2. **`ai/training/puppeteer-game-runner.js`**

   - Replace `executeAITurn()` with continuous loop
   - Add movement control application
   - Update decision making to handle 4 outputs

3. **`ai/training/fitness-calculator.js`**

   - Add positioning quality scoring
   - Add assisted movement bonus
   - Add movement efficiency metrics

4. **`ai/training/browser-injections.js`**

   - Add `findBestPositionToShoot()` injection
   - Add `checkIfPositionCanHitEnemy()` injection
   - Update look-ahead to support position testing

5. **`ai/simple/self-damage-trainer.js`**
   - Update network initialization (3 → 4 outputs)
   - Update stats tracking (add movement metrics)
   - Update logging (show movement performance)

---

## 🎯 Expected Outcomes

### **Short-Term (Phase 1)**

- Network learns basic positioning
- Moves toward enemy before shooting
- Self-damage remains low (~12-15 HP)
- Foundation for advanced movement

### **Mid-Term (Phases 2-3)**

- Complex movement mastery
- Jump timing and sequences
- Adaptive behavior when stuck
- Competitive positioning strategies

### **Long-Term (Phase 4)**

- Human-competitive gameplay
- Strategic depth (retreat, rush, positioning)
- Win 40%+ vs intermediate players
- Balanced aiming + movement + survival

---

## 📝 Notes & Considerations

### **Why 150ms Decision Interval?**

- Fast enough: ~200 decisions per 30s turn
- Not too fast: Physics needs time to settle
- Allows complex sequences: Jump → move → jump → shoot

### **Why 100px Grid Search?**

- Balance: Precision vs performance
- Covers map: ±500px = 121 candidate positions
- Fast enough: <50ms to evaluate all positions

### **Why Not Discrete Movement Actions?**

- Continuous control = natural for time-based movement
- Network outputs map directly to button states
- Complex behaviors emerge from repeated simple decisions
- More human-like: Hold buttons, time jumps

### **Supervised Learning Strategy**

- **Aiming:** Network learns from look-ahead's angle choice (✅ working)
- **Movement:** Network learns from assistance's position choice (new)
- **Hybrid approach:** Assistance guides, but network can override if confident

---

## 🚧 Risks & Mitigation

### **Risk: Movement Overfitting**

- **Problem:** Network only learns specific movement patterns
- **Mitigation:** Train on all maps from start, randomize spawn positions

### **Risk: Position Search Too Slow**

- **Problem:** 150ms interval can't wait for full grid search
- **Mitigation:** Cache best position, only update every 1-2 seconds

### **Risk: Jump Timing Too Hard**

- **Problem:** Network struggles to learn jump sequences
- **Mitigation:** Phase 2 focuses entirely on jumping, longer training

### **Risk: Fitness Imbalance**

- **Problem:** Movement rewards overshadow aiming quality
- **Mitigation:** Careful weight tuning, monitor both metrics

---

## ✅ Definition of Done

**Phase 1:** AI consistently moves to better positions before shooting  
**Phase 2:** AI uses jumps effectively to reach elevated positions  
**Phase 3:** AI masters complex movement (friction climbing, timing)  
**Phase 4:** AI wins 40%+ of games vs intermediate human players

**Final Success:** Complete, competitive AI that can:

- Position strategically
- Use movement and jumping effectively
- Aim accurately and avoid self-damage
- Compete against human players
- Provide challenging, fun gameplay experience

---

**Document Status:** ✅ Complete - Ready for Implementation  
**Next Step:** Begin Phase 1 - Horizontal Movement Implementation
