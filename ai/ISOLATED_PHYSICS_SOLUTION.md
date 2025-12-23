# Isolated Physics Engine Solution

## Problem

Current `__simulateBazookaPhysics__` calls `scene.matter.world.step()` which advances the ENTIRE game world, causing:

- 40,000+ pixel prediction errors
- Game state pollution
- Wrong physics accumulation

## Solution: Isolated Matter.js Engine

### ✅ Will This Simulate Correctly from Player Position?

**YES! Here's why:**

1. **Player Position**: Passed as `startX, startY` parameters - projectile starts at exact player location
2. **Terrain**: We reference the SAME terrain bodies from the game (they're static, read-only)
3. **Gravity**: Set to match game gravity (0.981)
4. **Velocity**: Applied to projectile in isolated engine
5. **Collisions**: Detected against the same terrain the real game uses

### How It Works

```
GAME WORLD (untouched)          SIMULATION WORLD (isolated)
┌─────────────────────┐         ┌─────────────────────┐
│  Player at (155,590)│         │                     │
│  Terrain bodies     │────────▶│  Same terrain (ref) │
│  Other players      │         │  Projectile (155,590)│
│  ❌ NOT STEPPED     │         │  ✅ STEP THIS!      │
└─────────────────────┘         └──────────────

│────────────────────────────────────────────────────▶
                    Time
```

### Implementation

The isolated engine:

1. Creates new Matter.js Engine instance
2. Adds references to terrain bodies (static, no copy needed)
3. Creates temporary projectile at player position
4. Steps ONLY the simulation engine (300 frames max)
5. Returns landing position
6. No impact on game world!

### Key Point

The terrain bodies are **static objects** in Matter.js. We can add them to multiple engines without side effects because they don't move. The simulation reads their positions for collision detection but doesn't modify them.

## Implementation Plan

1. Remove game speed multiplier logic
2. Create `Matter.Engine.create()` for simulation
3. Add terrain bodies to simulation world
4. Create projectile at (startX, startY)
5. Step simulation engine with `Matter.Engine.update()`
6. Check collisions in simulation world
7. Return landing position
8. Dispose simulation engine

## Result

✅ Accurate predictions (same physics as real game)
✅ No game pollution (isolated engine)
✅ Works from any player position
✅ Handles any terrain layout
✅ Future-proof for grenades, bounces, etc.
