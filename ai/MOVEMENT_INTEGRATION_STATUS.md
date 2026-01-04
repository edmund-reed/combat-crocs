# Movement Integration Status

**Date:** December 29, 2025  
**Status:** 🚧 **90% Complete - Ready for Testing with Minor Tweaks**

---

## ✅ Completed Components

### 1. **New Modular Files Created**

- ✅ `ai/training/movement-simulator.js` - Physics simulation for jumps/walks
- ✅ `ai/training/movement-assistance.js` - Pathfinding (ground + jump)
- ✅ `ai/training/movement-controller.js` - Real movement execution in browser

### 2. **Updated Core Files**

- ✅ `ai/training/input-encoder.js` - **31 inputs** (25 old + 6 movement)
- ✅ `ai/training/browser-injections.js` - Movement assistance injected into browser
- ✅ `ai/training/puppeteer-game-runner.js` - Imports and injection ready

### 3. **Movement Inputs Added** (6 new)

1. `moveDistance` (0-1) - How far to move
2. `requiresJump` (0/1) - Need to jump?
3. `moveDirection` (-1/0/1) - Left/stay/right
4. `jumpHold` (0-1) - Jump hold duration
5. `canHitFromBest` (0/1) - Can hit from best position?
6. `heightGained` (0-1) - Height gained from jump

---

## 🔧 Still TODO (Required for Testing)

### Critical Updates Needed:

### 1. **Update `makeAIDecision()` in puppeteer-game-runner.js**

**Current:** Network outputs 3 values, immediately shoots  
**Need:**

- Call movement assistance to get pathfinding guidance
- Network outputs 4 values (action, moveDirection, shouldJump, aimAngle)
- Add movement path data to gameState before encoding

**Location:** Line ~1450 in `puppeteer-game-runner.js`

**Code to add:**

```javascript
async makeAIDecision(gameState, team) {
  if (team === 2) {
    // Random opponent unchanged
    return this.makeRandomDecision(gameState);
  }

  // NEW: Get movement pathfinding guidance
  const movementPath = await this.page.evaluate((playerPos, enemyPos) => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    return window.__findBestMovementPath__(playerPos, enemyPos, scene);
  }, { x: gameState.self.x, y: gameState.self.y },
     gameState.enemies[0] ? { x: gameState.enemies[0].x, y: gameState.enemies[0].y } : null);

  // Add movement path to gameState for encoding
  gameState.movementPath = movementPath;

  // Encode with movement inputs
  const inputs = this.customEncoder(gameState);

  // Activate network
  const network = neataptic.Network.fromJSON(networkJSON);
  const outputs = network.activate(inputs);

  // NEW: 4 outputs instead of 3
  const action = outputs[0];           // 0-1: <0.5 = move, ≥0.5 = shoot
  const moveDirection = outputs[1];    // -1 to +1
  const shouldJump = outputs[2];       // 0-1: ≥0.5 = jump
  const networkAngle = outputs[3] * 2 * Math.PI; // Aim angle

  // Decision: move or shoot?
  if (action < 0.5) {
    // MOVE (not implemented yet in this phase)
    // For now, force to shoot
    console.log('  ℹ️  Network wants to move, but movement execution not yet implemented');
  }

  // SHOOT (same as before)
  const lookAheadResult = await this.page.evaluate(
    (gs, netAngle) => window.__runLookAheadSimulation__(gs, netAngle),
    gameState,
    networkAngle,
  );

  lookAheadResult.networkAngle = networkAngle;
  return lookAheadResult;
}
```

### 2. **Update `self-damage-trainer.js` Network Config**

**Current:** 25 inputs → 3 outputs  
**Need:** 31 inputs → 4 outputs

**Location:** Line ~50 in `ai/simple/self-damage-trainer.js`

**Code to change:**

```javascript
networkConfig: {
  inputs: 31,    // Was 25
  outputs: 4,    // Was 3
  hidden: [31, 24, 16],  // Deeper for more complex behavior
},
```

### 3. **Update `fitness-calculator.js`** (Optional for Phase 1)

Add movement quality scoring:

```javascript
// In calculateFitness(), add after existing fitness calculation:

// === MOVEMENT QUALITY (NEW) ===
// Reward good positioning (optional - can add later)
if (movementMetrics?.shotFromGoodPosition) {
  fitness += 100; // Shot from recommended position
}
```

---

## 🎯 Testing Plan

### **Phase 1: Verify System Works** (15 minutes)

1. **Update the 2 critical files above**
2. **Clear old checkpoints:**

   ```bash
   rm -rf ai/checkpoints/*
   rm -rf ai/models/*
   ```

3. **Run headed test:**

   ```bash
   cd ai/simple
   node self-damage-trainer.js --gen 2 --pop 5 --games 2 --tabs 1 --headed
   ```

4. **Watch for:**
   - ✅ Browser opens and game starts
   - ✅ Movement pathfinding logs appear
   - ✅ 31 inputs being encoded
   - ✅ 4 outputs from network
   - ✅ No crashes

### **Phase 2: Verify Pathfinding** (10 minutes)

Check browser console (F12) for:

```
[AI] Movement assistance injected and ready
[AI] Look-ahead simulation injected
```

Check Node console for:

```
31 inputs (25 previous + 6 movement)
4 outputs (action, moveDirection, shouldJump, aimAngle)
```

### **Phase 3: Short Training Run** (30 minutes)

```bash
node self-damage-trainer.js --gen 10 --pop 10 --games 3 --tabs 3 --instant-shot
```

**Success criteria:**

- ✅ Completes without crashes
- ✅ Networks evolve (fitness changes)
- ✅ Checkpoints save properly
- ✅ Movement inputs appear in logs

---

## 📊 Current Architecture

### **Inputs: 31 total**

- 25 existing (health, position, terrain, feedback, etc.)
- 6 movement (distance, direction, jump, canHit, etc.)

### **Outputs: 4 total**

1. `action` (0-1) - Move vs shoot decision
2. `moveDirection` (-1 to +1) - Movement direction
3. `shouldJump` (0-1) - Jump control
4. `aimAngle` (0-1) - Aiming direction

### **Hidden Layers**

- Suggested: [31, 24, 16] or [31, 20, 12]
- Deeper than before due to increased complexity

---

## 🚀 Next Steps After Testing

1. **If pathfinding works:**

   - Implement actual movement execution (continuous loop)
   - Add movement to fitness function
   - Train for 20+ generations

2. **If pathfinding fails:**

   - Debug browser injection
   - Check InstantShotResolver availability
   - Verify terrain collision detection

3. **Future enhancements:**
   - Continuous 150ms decision loop
   - Real movement execution (walk/jump)
   - Movement fitness rewards
   - Instant movement mode (like instant shot)

---

## 💡 Key Implementation Details

### **Movement Pathfinding Flow**

```
1. Turn starts
2. Capture game state (player pos, enemy pos)
3. Run pathfinding in browser:
   - Test 10 ground positions (±500px)
   - Test 12 jump trajectories (if needed)
   - Pick best position that can hit enemy
4. Encode movement path into 6 inputs
5. Network decides: move or shoot?
6. Execute decision
```

### **Why This Approach Works**

- **Supervised learning:** Network learns from pathfinding "teacher"
- **Physics-accurate:** Uses real InstantShotResolver
- **Incremental:** Can test without movement execution first
- **Modular:** New files, minimal changes to existing code

---

## ⚠️ Known Limitations (Phase 1)

1. **Movement execution not implemented yet**

   - Network can output movement, but we force shoot
   - Will add continuous loop in Phase 2

2. **Fitness doesn't reward movement**

   - Currently same as before
   - Will add positioning bonus later

3. **Single decision per turn**
   - No continuous movement yet
   - Will add 150ms loop later

**These are intentional** - we're testing the foundation first!

---

## 📝 Files Changed Summary

**New files (3):**

- `movement-simulator.js`
- `movement-assistance.js`
- `movement-controller.js`

**Modified files (3):**

- `input-encoder.js` - Added 6 inputs
- `browser-injections.js` - Added movement assistance
- `puppeteer-game-runner.js` - Added imports, injection

**Still need to modify (2):**

- `puppeteer-game-runner.js` - Update makeAIDecision()
- `self-damage-trainer.js` - Update network config

---

## 🎬 Ready to Test!

Once you make the 2 critical updates above, you're ready to run your first test with the new system. Start with headed mode to watch the AI think about movement!

**Good luck! 🚀**
