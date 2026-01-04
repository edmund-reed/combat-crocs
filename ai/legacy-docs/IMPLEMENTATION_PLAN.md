# Strategic AI Training - Implementation Plan

## Changes Summary

### 1. Network Architecture

**BEFORE:** 1 output (angle)
**AFTER:** 3 outputs

- `actionType`: 0-1 (sigmoid) - shoot (≥0.5) or move (<0.5)
- `movementDistance`: -1 to +1 (tanh) - direction and magnitude
- `aimAngle`: 0-2π - shooting angle

### 2. Browser Look-Ahead (puppeteer-game-runner.js)

**BEFORE:**

- Tests 3 positions (left, current, right)
- Tests 12 angles per position = 36 total candidates
- Always picks best regardless of success

**AFTER:**

- Tests ONLY current position
- Tests network angle + 36 evenly spaced angles (every 10°) = 37 total
- Returns success/failure based on criteria:
  - Landing within 80px of enemy (damage radius)
  - Clear line-of-sight (no terrain blocking)
  - > 150px from self (safety distance)
- If no successful shot → returns null

### 3. Strategic Execution Loop

**NEW:** Multi-move capability

```
while (timeRemaining > 5 && attempts < 3):
  1. Network decides: shoot or move?
  2. If shoot:
     - Run look-ahead from current position
     - If successful shot found → execute & end turn
     - If no successful shot → treat as move instead
  3. If move:
     - Execute movement (50-150px based on network output)
     - Update position
     - Loop back to step 1
```

### 4. Input Encoding (24 inputs)

**Current State (14):**
1-3. self.x, self.y, self.healthPercent
4-6. enemy.x, enemy.y, enemy.healthPercent
7-14. terrain distances (8 directions)

**Feedback (10):** 15. lastAction (shoot=1, move=0) 16. lastMovementDistance (-1 to +1) 17. lastAngle
18-19. explosion.x, explosion.y
20-21. distToSelf, distToEnemy 22. damageTaken 23. damageDealt 24. didHitEnemy (0/1)

### 5. Fitness Function

**REMOVE:**

- ❌ Movement penalty
- ❌ "Shot first try" bonus
- ❌ "Network angle chosen" bonus

**KEEP/ADD:**

```javascript
fitness = 100
  - selfDamage × 3
  + enemyDamage × 5
  + (enemyDamage / Math.max(turns, 1)) × 10  // Efficiency
  + (win ? 150 : 0)
  + (enemyDamage > 80 && selfDamage < 10 ? 50 : 0)  // Clean win
```

### 6. Files to Modify

- [ ] `ai/training/puppeteer-game-runner.js` (strategic loop + look-ahead)
- [ ] `ai/simple/self-damage-trainer.js` (3 outputs + encoder + fitness)

### 7. Testing Plan

1. Test 1 generation with 3 networks, 2 games each
2. Verify strategic behavior (moves before shooting when needed)
3. Check feedback data structure
4. Validate fitness calculations

## Implementation Order

1. Update puppeteer-game-runner.js (browser strategic loop)
2. Update self-damage-trainer.js (network architecture + fitness)
3. Delete old checkpoints (incompatible with new architecture)
4. Run test: `node self-damage-trainer.js --pop 3 --gen 1 --games 2 --tabs 1 --test`
