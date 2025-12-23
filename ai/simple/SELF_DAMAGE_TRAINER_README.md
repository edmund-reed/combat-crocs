# Self-Damage Avoidance Trainer

**Focused Goal:** Teach AI to avoid damaging itself (no enemy targeting complexity)

## Key Improvements

### 1. Simplified Inputs (27 → 20)

Removed confusing enemy-related data to focus purely on self-preservation:

**Removed:**

- Enemy distance, angle, health (3 inputs)
- Enemy damage feedback (2 inputs)
- Other noise (2 inputs)

**Kept (20 inputs):**

- Blast radius (1)
- Self position & health (3)
- Self-damage feedback (2)
- Last explosion position (3)
- **8-directional terrain distances** (8)
- Safety metrics (3)

### 2. Comprehensive Terrain Awareness

The AI has **8-directional raycasting** for complete spatial awareness:

- Right, Up-Right, Up, Up-Left, Left, Down-Left, Down, Down-Right
- Each direction reports distance to nearest terrain
- Includes safety margin calculation (minTerrain - 140)

This allows the AI to:

- Detect nearby walls/terrain in all directions
- Calculate if shooting in a direction is safe
- Understand when explosions landed near terrain

### 3. JSON Input Logging

Every turn's inputs are logged to JSON files for inspection:

```json
{
  "gameId": "game-1234567890-1",
  "network": 1,
  "generation": 1,
  "map": "hotelOfHorror",
  "turns": [
    {
      "turnNumber": 1,
      "inputs": {
        "blastRadius": 140,
        "self": {
          "x": 450,
          "y": 320,
          "healthPercent": 1.0
        },
        "feedback": {
          "didDamageSelf": false,
          "damageTaken": 0
        },
        "lastExplosion": {
          "x": 0,
          "y": 0,
          "distanceFromSelf": 1000
        },
        "terrain": {
          "directions": [120, 200, 450, 380, 250, 180, 300, 220],
          "directionNames": ["right", "upRight", "up", "upLeft", "left", "downLeft", "down", "downRight"],
          "minDistance": 120,
          "rightDistance": 120,
          "safetyMargin": -20
        },
        "rawInputArray": [140, 450, 320, 1.0, ...]
      },
      "decision": {
        "weapon": "BAZOOKA",
        "aimAngle": -0.45,
        "aimAngleDegrees": -25.8
      }
    }
  ],
  "result": {
    "selfDamage": 0,
    "fitness": 300
  }
}
```

## Usage

### Quick Test (3 games, with input logging)

```bash
cd ai/simple
node self-damage-trainer.js --test
```

Check logs in: `ai/data/input-logs/game-*.json`

### Full Training

```bash
# Single tab
node self-damage-trainer.js --gen 50 --pop 50

# Parallel tabs (24x speedup with 4 tabs!)
node self-damage-trainer.js --gen 50 --pop 50 --tabs 4

# With input logging (first 10 games only)
node self-damage-trainer.js --gen 50 --pop 50 --tabs 4 --log-inputs --log-limit 10
```

### CLI Flags

- `--pop 20` - Population size
- `--gen 10` - Number of generations
- `--games 8` - Games per network evaluation
- `--tabs 4` - Parallel browser tabs (1-8 recommended)
- `--mutation 0.2` - Mutation rate
- `--elitism 4` - Number of elite networks to preserve
- `--headed` - Visual mode (for debugging)
- `--test` - Quick test mode (1 net, 1 gen, 3 games, headed, logging enabled)
- `--log-inputs` - Enable JSON input logging
- `--log-limit 10` - Maximum games to log (default: 999)

## Expected Performance

### Training Speed

- **1 tab:** ~7-10 minutes for 10 generations (6x baseline)
- **4 tabs:** ~2-3 minutes for 10 generations (24x baseline!)
- **8 tabs:** ~90 seconds for 10 generations (48x baseline!)

### Learning Goals

- **Generation 1:** ~50-70 HP self-damage per game (random shots)
- **Generation 10:** <20 HP self-damage per game (learning)
- **Generation 50:** <10 HP self-damage per game (mastery)
- **Success:** 10+ HP improvement from Gen 1 to final

## Terrain Detection Verification

The trainer uses `src/utils/terrain-scanner.js` which performs **8-directional raycasts**:

```javascript
// Directions checked:
0° (RIGHT)
45° (UP-RIGHT)
90° (UP)
135° (UP-LEFT)
180° (LEFT)
225° (DOWN-LEFT)
270° (DOWN)
315° (DOWN-RIGHT)
```

Each raycast:

1. Shoots from player position to maxDistance (500px)
2. Detects all matter bodies along the ray
3. Filters for terrain bodies (`body.isTerrain`)
4. Returns distance to closest terrain hit

This provides the AI with complete 360° spatial awareness to avoid self-damage.

## Output

- **Model:** `ai/models/self-damage-avoidance.json`
- **Logs:** `ai/data/input-logs/*.json` (if --log-inputs enabled)

## Why This Approach Works

1. **Focused objective:** Only learning self-avoidance, not enemy targeting
2. **Clear feedback:** Immediate self-damage signal each turn
3. **Complete spatial data:** 8-directional terrain awareness
4. **Labeled logging:** Can inspect exactly what the AI "sees"
5. **Simplified inputs:** Less noise = faster learning
6. **Smaller network:** [20 → 12 → 6 → 1] for simpler problem

## Next Steps

After the AI learns self-avoidance:

1. Review input logs to verify terrain data is correct
2. Analyze decision patterns (which angles are safe/unsafe)
3. Phase 2: Add enemy targeting (keeping self-damage learning intact)
