# Combat Crocs AI Training System - Complete Technical Documentation

**Version:** 2.0 (Strategic AI with Look-Ahead)  
**Last Updated:** December 27, 2025  
**Purpose:** Complete system documentation for rebuilding from scratch

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Training Pipeline](#training-pipeline)
4. [Neural Network](#neural-network)
5. [Checkpoint System](#checkpoint-system)
6. [Behavior Logic](#behavior-logic)
7. [Physics Simulation](#physics-simulation)
8. [Fitness Function](#fitness-function)
9. [Data Flow](#data-flow)
10. [File Structure](#file-structure)
11. [Rebuilding Guide](#rebuilding-guide)

---

## System Overview

### What It Does

The AI training system teaches neural networks to play Combat Crocs (a Worms-like game) using **evolutionary algorithms**. The current version trains networks to balance two goals:

1. **Avoid self-damage** (don't shoot yourself)
2. **Attack the enemy** (deal damage effectively)

### Key Technologies

- **NEAT (NeuroEvolution of Augmenting Topologies)** - Evolutionary neural networks
- **Puppeteer** - Browser automation for game control
- **Phaser Matter.js** - Physics engine for trajectory simulation
- **Node.js** - Training orchestration

### Training Approach

1. **Population-based**: 20-30 networks compete each generation
2. **Game-based evaluation**: Each network plays 6-8 games
3. **Fitness scoring**: Networks ranked by performance
4. **Evolution**: Best networks reproduce, worst die
5. **Checkpointing**: Progress saved every 5 generations

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│  self-damage-trainer.js (Orchestration)                 │
│  - Creates NEAT population                              │
│  - Manages training loop                                │
│  - Calculates fitness                                   │
│  - Saves checkpoints                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  PuppeteerGameRunner (Game Automation)                  │
│  - Launches Chrome browser                              │
│  - Injects AI controllers                               │
│  - Captures game state                                  │
│  - Executes decisions                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Combat Crocs Game (Browser)                            │
│  - Phaser game engine                                   │
│  - Real physics simulation                              │
│  - Training mode optimizations                          │
│  - Explosion damage calculations                        │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File                                   | Purpose                         | Lines |
| -------------------------------------- | ------------------------------- | ----- |
| `ai/simple/self-damage-trainer.js`     | Main training orchestrator      | ~1400 |
| `ai/training/puppeteer-game-runner.js` | Browser automation & AI control | ~1300 |
| `ai/simple/network-analyzer.js`        | Network introspection           | ~200  |
| `src/weapons/instant-shot-resolver.js` | Fast physics for training       | ~100  |
| `src/weapons/explosion-system.js`      | Damage calculations             | ~150  |

---

## Training Pipeline

### 1. Initialization

```javascript
// Load checkpoint or start fresh
const checkpoint = await loadFromCheckpoint();
const startingGeneration = checkpoint ? checkpoint.generation : 0;

// Create NEAT algorithm
const neat = new Neat(24, 3, null, {
  popsize: 20, // Population size
  mutationRate: 0.2, // Mutation probability
  elitism: 10, // Top N networks survive unchanged
});

// Restore population if continuing training
if (checkpoint) {
  neat.population = checkpoint.population.map(netJSON => Network.fromJSON(netJSON));
}
```

### 2. Generation Loop

```javascript
for (let gen = 1; gen <= config.generations; gen++) {
  // For each network in population
  for (let network of neat.population) {
    // Play multiple games for robust evaluation
    const results = [];
    for (let game = 0; game < config.gamesPerEvaluation; game++) {
      const result = await playSingleGame(runner, network, opponent, map);
      results.push(result);
    }

    // Calculate average fitness
    network.score = average(results.map(r => r.fitness));
    network.avgSelfDamage = average(results.map(r => r.selfDamage));
    network.avgEnemyDamage = average(results.map(r => r.enemyDamage));
  }

  // Sort by fitness (best first)
  neat.sort();

  // Evolve to next generation
  neat.evolve();

  // Save checkpoint every 5 generations
  if (gen % 5 === 0) {
    await saveCheckpoint(neat, gen, stats);
  }
}
```

### 3. Parallel Training

The system supports parallel game execution using multiple browser tabs:

```javascript
// Create tab pool
const tabPool = [];
for (let i = 0; i < config.parallelTabs; i++) {
  const runner = new PuppeteerGameRunner({...});
  await runner.initialize();
  tabPool.push(runner);
}

// Batch games across tabs
for (let batchStart = 0; batchStart < allGames.length; batchStart += tabCount) {
  const batch = allGames.slice(batchStart, batchStart + tabCount);
  await Promise.all(batch.map(game => playGame(game)));
}
```

**Speedup**: 6 tabs × 6x instant mode = **36x faster** than real-time

---

## Neural Network

### Input Layer (24 Neurons)

The network receives 24 inputs describing the current game state:

#### Current State (14 inputs)

```javascript
// Self position & health (3)
inputs.push(gameState.self.x); // 0-1200 (normalized)
inputs.push(gameState.self.y); // 0-600 (normalized)
inputs.push(gameState.self.health / 100); // 0-1

// Enemy position & health (3)
inputs.push(enemy.x || 0); // 0-1200
inputs.push(enemy.y || 0); // 0-600
inputs.push((enemy.health || 0) / 100); // 0-1

// Terrain distances (8 directions)
// Right, UpRight, Up, UpLeft, Left, DownLeft, Down, DownRight
inputs.push(...terrainDistances); // 8 values: 0-1400px
```

#### Feedback from Last Action (10 inputs)

```javascript
// Last action type
inputs.push(lastDecision.actionType === "shoot" ? 1 : 0); // 0 or 1

// Last movement
let movementValue = 0;
if (lastMovement === "left") movementValue = -0.5;
else if (lastMovement === "right") movementValue = 0.5;
inputs.push(movementValue); // -0.5, 0, or 0.5

// Last aim angle
inputs.push(lastDecision.aimAngle || 0); // 0-2π

// Explosion position
inputs.push(feedback.explosionX || 0); // 0-1200
inputs.push(feedback.explosionY || 0); // 0-600

// Distance from explosion
inputs.push(explosionDistFromSelf); // 0-1400px
inputs.push(explosionDistFromEnemy); // 0-1400px

// Damage feedback
inputs.push(feedback.damageTaken || 0); // 0-100 HP
inputs.push(feedback.damageDealt || 0); // 0-100 HP

// Hit success flag
inputs.push(feedback.didDamageEnemy ? 1 : 0); // 0 or 1
```

**Total: 24 inputs**

### Hidden Layers

```javascript
const hidden = [24, 16, 10]; // Three hidden layers
```

- **Layer 1**: 24 neurons (match input size)
- **Layer 2**: 16 neurons (dimensionality reduction)
- **Layer 3**: 10 neurons (compact representation)

Architecture created using NEAT's Perceptron architect:

```javascript
const template = new architect.Perceptron(
  24, // inputs
  24,
  16,
  10, // hidden layers
  3, // outputs
);
```

### Output Layer (3 Neurons)

```javascript
const outputs = network.activate(inputs);

// Output 0: Action type (move vs shoot)
const actionType = outputs[0]; // 0-1 range
const shouldShoot = actionType >= 0.5; // Threshold

// Output 1: Movement distance (if moving)
const movementDistance = outputs[1]; // -1 to +1
const moveDir = movementDistance < 0 ? "left" : "right";
const moveAmount = Math.abs(movementDistance) * 100 + 50; // 50-150px

// Output 2: Aim angle (if shooting)
const networkAngle = outputs[2] * 2 * Math.PI; // 0 to 2π radians
```

---

## Checkpoint System

### Checkpoint Format

Checkpoints save the **entire population**, not just the best network:

```json
{
  "generation": 20,
  "timestamp": "2025-12-27T05:00:00.000Z",
  "population": [
    {
      /* Network 1 JSON */
    },
    {
      /* Network 2 JSON */
    }
    // ... all 20-30 networks
  ],
  "stats": {
    "bestFitness": 529,
    "avgFitness": 412,
    "avgSelfDamage": 9.8,
    "bestSelfDamage": 4.2
  },
  "networkAnalysis": {
    "nodeCount": 67,
    "connectionCount": 551,
    "inputInfluences": {
      /* ... */
    }
  },
  "config": {
    "populationSize": 20,
    "mutationRate": 0.2,
    "networkArchitecture": [24, 16, 10]
  }
}
```

### Save Logic

```javascript
async function saveCheckpoint(neat, generation, stats) {
  const checkpoint = {
    generation: generation,
    timestamp: new Date().toISOString(),
    population: neat.population.map(net => net.toJSON()), // ← Full population!
    stats: {
      /* ... */
    },
    networkAnalysis: analyzeNetwork(neat.population[0]),
    config: {
      /* ... */
    },
  };

  const filename = `self-damage-checkpoint-gen${String(generation).padStart(2, "0")}.json`;
  await fs.promises.writeFile(filepath, JSON.stringify(checkpoint, null, 2));
}
```

**Saved every**: 5 generations  
**Retention**: Last 2 checkpoints kept (older deleted)

### Load Logic

```javascript
async function loadFromCheckpoint() {
  // Find latest checkpoint
  const files = await fs.promises.readdir(checkpointDir);
  const latestCheckpoint = files
    .filter(f => f.match(/self-damage-checkpoint-gen(\d+)\.json/))
    .sort((a, b) => b.generation - a.generation)[0];

  if (!latestCheckpoint) return null;

  // Load and restore population
  const checkpoint = JSON.parse(await fs.promises.readFile(filepath));
  return {
    generation: checkpoint.generation,
    population: checkpoint.population, // Array of network JSONs
    stats: checkpoint.stats,
  };
}

// In main training loop
const checkpoint = await loadFromCheckpoint();
if (checkpoint) {
  neat.population = checkpoint.population.map(netJSON => Network.fromJSON(netJSON));
  startingGeneration = checkpoint.generation;
}
```

**Why save full population?**

- Preserves genetic diversity
- Allows evolution to continue naturally
- Prevents loss of potentially useful traits
- Enables true resumption of training

---

## Behavior Logic

### Decision Making Flow

```
Network Outputs
     ↓
actionType < 0.5?  ──YES──> MOVE Decision
     ↓ NO                       ↓
SHOOT Decision              Calculate move
     ↓                       direction & distance
Run Look-Ahead                   ↓
Simulation                   Execute move
     ↓
Test 37 angles
(network + 36 random)
     ↓
Found valid shot? ──NO──> Fallback to MOVE
     ↓ YES
Pick best angle
     ↓
Execute shoot
```

### Look-Ahead Physics Simulation

When the network chooses to shoot, the system runs a **look-ahead** to verify the shot is safe:

```javascript
// Test network angle + 36 evenly spaced angles (every 10°)
const anglesToTest = [networkAngle];
for (let deg = 0; deg < 360; deg += 10) {
  anglesToTest.push((deg * Math.PI) / 180);
}

// For each angle, simulate where projectile will land
for (const angle of anglesToTest) {
  // Use real Phaser physics simulation
  const landing = window.__simulateBazookaPhysics__(scene, playerPos.x, playerPos.y, angle, velocity);

  // Calculate if this shot would damage enemy
  const distToEnemy = distance(landing, enemyPos);
  const canDamageEnemy =
    distToEnemy <= DAMAGE_RADIUS && // Within blast radius
    !isExplosionBlocked(landing.x, landing.y, enemyPos.x, enemyPos.y); // Not blocked by terrain

  // Track best angle that hits enemy
  if (canDamageEnemy && distToEnemy < minDistToEnemy) {
    bestAngle = angle;
    minDistToEnemy = distToEnemy;
    foundSuccessfulShot = true;
  }
}

// Return best angle, or null if no valid shot
return foundSuccessfulShot ? bestAngle : null;
```

**Key Points:**

- Uses **PhysicsManager.isExplosionBlocked** (same as real game!)
- DAMAGE_RADIUS = 140px (bazooka explosion radius)
- Tests 37 total angles for thorough coverage
- Returns null if no valid shot (triggers move action)

### Move vs Shoot Decision

```javascript
if (!shouldShoot) {
  // Network chose MOVE
  return {
    movement: movementDistance < 0 ? "left" : "right",
    movementDistance: Math.abs(movementDistance) * 100 + 50,
    actionType: "move",
    aimAngle: networkAngle, // Still tracked for logging
  };
}

// Network chose SHOOT - run look-ahead
const bestAngle = await runLookAheadSimulation(gameState);

if (bestAngle === null) {
  // Look-ahead found no valid shot - fallback to move
  return {
    movement: movementDistance < 0 ? "left" : "right",
    movementDistance: Math.abs(movementDistance) * 100 + 50,
    actionType: "move",
    explorationUsed: true, // Flag: forced to move
  };
}

// Valid shot found!
return {
  aimAngle: bestAngle,
  actionType: "shoot",
  movement: "none",
  explorationUsed: Math.abs(bestAngle - networkAngle) > 0.001,
};
```

**explorationUsed flag**: Tracks when look-ahead overrode network's choice (for metrics)

---

## Physics Simulation

### Why Physics Simulation?

The game uses **projectile physics** - you fire at an angle and the projectile arcs through the air. The AI needs to predict where the shot will land to avoid self-damage.

### Implementation

The simulation is injected into the browser and uses **real Phaser Matter.js physics**:

```javascript
window.__simulateBazookaPhysics__ = function (scene, startX, startY, angle, velocity) {
  // Create ghost body (sensor = no collision with players)
  const tempBody = scene.matter.add.circle(startX, startY, 8, {
    isSensor: true,
    friction: 0.1,
    restitution: 0.1,
    mass: 1,
  });

  // Set initial velocity
  const vx = Math.cos(angle) * velocity;
  const vy = Math.sin(angle) * velocity;
  scene.matter.body.setVelocity(tempBody, { x: vx, y: vy });

  // Simulate physics until collision
  for (let steps = 0; steps < 300; steps++) {
    // Step physics forward
    scene.matter.world.step(1000 / 60); // 60 FPS

    // Check for terrain collision
    const collisions = Phaser.Physics.Matter.Matter.Query.point(scene.matter.world.localWorld.bodies, {
      x: tempBody.position.x,
      y: tempBody.position.y,
    });

    if (collisions.find(c => c.isTerrain)) {
      // Hit terrain! Return collision point
      const collisionPos = { x: tempBody.position.x, y: tempBody.position.y };
      scene.matter.world.remove(tempBody);
      return collisionPos;
    }

    // Check out of bounds
    if (tempBody.position.y > scene.game.config.height + 100) {
      scene.matter.world.remove(tempBody);
      return { x: tempBody.position.x, y: scene.game.config.height };
    }

    // Check if velocity near zero (resting on ground)
    const speed = Math.sqrt(tempBody.velocity.x ** 2 + tempBody.velocity.y ** 2);
    if (speed < 0.1 && steps > 10) {
      const restingPos = { x: tempBody.position.x, y: tempBody.position.y };
      scene.matter.world.remove(tempBody);
      return restingPos;
    }
  }

  // Timeout fallback
  scene.matter.world.remove(tempBody);
  return { x: tempBody.position.x, y: tempBody.position.y };
};
```

### Critical Physics Parameters

```javascript
// From weapons.js config
const velocity = 15; // Bazooka projectile speed
const gravity = 1.5; // Phaser world gravity
const mass = 1; // Projectile mass
const DAMAGE_RADIUS = 140; // Explosion blast radius
```

**IMPORTANT**: These must match the real game exactly or the simulation will be inaccurate!

### Common Bugs (Fixed)

❌ **Bug 1**: Using `lastValidPos` (position from previous step)  
✅ **Fix**: Return `tempBody.position` (current collision point)

❌ **Bug 2**: Applying 50px explosion offset to prediction  
✅ **Fix**: Return raw collision point (offset is only for visual rendering)

❌ **Bug 3**: Using custom line-of-sight instead of PhysicsManager  
✅ **Fix**: Use `PhysicsManager.isExplosionBlocked` (same as real damage calculations)

---

## Fitness Function

### Goals

1. **Primary**: Avoid self-damage
2. **Secondary**: Deal damage to enemy
3. **Tertiary**: Win the game

### Formula

```javascript
function calculateFitness(gameStats, decision) {
  let fitness = 100; // Base survival bonus

  // Calculate damages from turn-by-turn data
  let selfDamage = 0;
  let enemyDamageDealt = 0;

  for (const turn of gameStats.turnData) {
    if (turn.team === 1 && turn.inputs?.shotFeedback) {
      if (turn.inputs.shotFeedback.didDamageSelf) {
        selfDamage += turn.inputs.shotFeedback.damageTaken;
      }
      if (turn.inputs.shotFeedback.didDamageEnemy) {
        enemyDamageDealt += turn.inputs.shotFeedback.damageDealt;
      }
    }
  }

  // PENALTIES
  fitness -= selfDamage * 3; // Penalty for self-damage

  // REWARDS
  fitness += enemyDamageDealt * 5; // Strong reward for enemy damage

  // Network angle selection bonus
  if (decision && !decision.explorationUsed) {
    fitness += 15; // Small bonus when network's angle is chosen
  }

  // Damage efficiency bonus
  const damagePerTurn = enemyDamageDealt / gameStats.turns;
  if (damagePerTurn >= 40) {
    fitness += 100; // Ultra-fast kill bonus
  } else if (damagePerTurn >= 20) {
    fitness += 50; // Fast kill bonus
  } else if (damagePerTurn >= 10) {
    fitness += 25; // Decent efficiency bonus
  }

  // Win bonus (only if earned through combat)
  if (gameStats.winner === 1) {
    if (enemyDamageDealt > 30) {
      fitness += 150; // Legitimate victory
    } else {
      fitness += 30; // Passive win (enemy self-destructed)
    }
  }

  return fitness;
}
```

### Balancing Rationale

**Why self-damage penalty is lower (×3) than enemy damage reward (×5)?**

- Enemy damage is the primary goal of the game
- Self-damage avoidance is a constraint, not the goal
- Too high penalty = AI becomes too passive
- Current balance encourages aggressive play while staying safe

**Why damage/turn bonuses?**

- Encourages efficient play
- Prevents long, drawn-out games
- Rewards networks that learn to aim accurately

---

## Data Flow

### Training Cycle Data Flow

```
1. START GENERATION
   ↓
2. For each network → Create browser tab
   ↓
3. GAME START
   │
   ├─→ Inject network into browser
   │   ↓
   ├─→ Hook into TurnManager.startTurn()
   │   ↓
   └─→ Game begins playing
       ↓
4. EACH TURN
   │
   ├─→ Capture game state (24 inputs)
   │   ↓
   ├─→ Network activates (3 outputs)
   │   ↓
   ├─→ Decision logic (move vs shoot)
   │   ↓
   ├─→ Look-ahead simulation (if shoot)
   │   ↓
   ├─→ Execute action in game
   │   ↓
   └─→ Capture feedback (damage dealt/taken)
       ↓
5. GAME END
   │
   ├─→ Calculate fitness from turn data
   │   ↓
   ├─→ Store results for network
   │   ↓
   └─→ Save input logs (optional)
       ↓
6. ALL GAMES COMPLETE
   │
   ├─→ Sort networks by fitness
   │   ↓
   ├─→ Evolve population (NEAT algorithm)
   │   ↓
   ├─→ Save checkpoint (every 5 gen)
   │   ↓
   └─→ Repeat for next generation
```

### Browser Injection Flow

```javascript
// 1. Trainer creates network
const network = neat.population[0];

// 2. Serialize network to JSON
const networkJSON = network.toJSON();

// 3. Inject into browser page
await page.evaluate(netJSON => {
  window.__AI_NETWORKS__ = {
    team1: netJSON, // Our AI
    team2: null, // Pure random opponent
  };
}, networkJSON);

// 4. Hook into game's turn system
await page.evaluate(() => {
  const gameScene = window.CombatCrocs.game.scene.getScene("GameScene");
  const originalStartTurn = gameScene.turnManager.startTurn;

  gameScene.turnManager.startTurn = function (...args) {
    originalStartTurn.call(this, ...args);

    // Signal AI to make decision
    window.__AI_TURN_DATA__ = {
      ready: true,
      playerIndex: this.getCurrentPlayerIndex(),
      team: gameScene.players[this.getCurrentPlayerIndex()].team,
    };
  };
});

// 5. Node.js waits for turn signal
await page.waitForFunction(() => window.__AI_TURN_DATA__?.ready);

// 6. Capture game state from browser
const gameState = await page.evaluate(() => {
  const scene = window.CombatCrocs.game.scene.getScene("GameScene");
  return extractGameState(scene);
});

// 7. Activate network in Node.js
const inputs = encodeSelfDamageGameState(gameState);
const outputs = network.activate(inputs);

// 8. Send decision back to browser
await page.evaluate(decision => {
  executeAction(decision);
}, makeDecision(outputs, gameState));
```

---

## File Structure

### Directory Layout

```
combat-crocs/
├── ai/
│   ├── simple/
│   │   ├── self-damage-trainer.js      ← Main training script
│   │   ├── network-analyzer.js         ← Network introspection
│   │   └── SELF_DAMAGE_TRAINER_README.md
│   │
│   ├── training/
│   │   └── puppeteer-game-runner.js    ← Browser automation
│   │
│   ├── checkpoints/                    ← Saved generations
│   │   ├── self-damage-checkpoint-gen05.json
│   │   ├── self-damage-checkpoint-gen10.json
│   │   └── ... (every 5 generations)
│   │
│   ├── models/                         ← Trained networks
│   │   └── self-damage-avoidance.json  ← Best network (if >= 5 gen)
│   │
│   ├── analysis/
│   │   └── training-history.json       ← All training sessions
│   │
│   └── data/
│       └── input-logs/                 ← Turn-by-turn game data
│           └── game-*.json
│
└── src/
    ├── weapons/
    │   ├── instant-shot-resolver.js    ← Fast physics for training
    │   └── explosion-system.js         ← Damage calculations
    │
    └── utils/
        └── physics-manager.js          ← Explosion blocking logic
```

### Key Data Files

#### Checkpoint File

**Location**: `ai/checkpoints/self-damage-checkpoint-gen20.json`

```json
{
  "generation": 20,
  "timestamp": "2025-12-27T05:00:00.000Z",
  "population": [
    /* 20-30 network JSONs */
  ],
  "stats": {
    "bestFitness": 529,
    "avgFitness": 412,
    "avgSelfDamage": 9.8,
    "bestSelfDamage": 4.2,
    "avgEnemyDamage": 68.5,
    "bestEnemyDamage": 82.1
  }
}
```

#### Training History File

**Location**: `ai/analysis/training-history.json`

```json
{
  "trainingSessions": [
    {
      "sessionId": 1735276800000,
      "startTime": "2025-12-27T04:00:00.000Z",
      "endTime": "2025-12-27T04:32:00.000Z",
      "durationMinutes": "32.5",
      "config": {
        /* ... */
      },
      "generations": [
        {
          "generationInSession": 1,
          "cumulativeGeneration": 21,
          "stats": {
            /* ... */
          },
          "networkAnalysis": {
            /* ... */
          }
        }
      ]
    }
  ]
}
```

#### Input Log File

**Location**: `ai/data/input-logs/game-1735276800000-1.json`

```json
{
  "gameId": "game-1735276800000-1",
  "network": 1,
  "generation": 1,
  "map": "dinocoaster",
  "result": {
    "winner": 1,
    "selfDamage": 12.5,
    "enemyDamage": 68.3,
    "fitness": 468,
    "turns": 15
  },
  "turns": [
    {
      "turnNumber": 1,
      "team": 1,
      "inputs": {
        "modelInputs": [
          /* 24 values */
        ],
        "structuredData": {
          /* labeled */
        }
      },
      "decision": {
        "aimAngle": 2.41,
        "actionType": "shoot",
        "movement": "none"
      }
    }
  ]
}
```

---

## Rebuilding Guide

### Prerequisites

```bash
# Install dependencies
cd ai
npm install neataptic puppeteer

# Game must be running on http://localhost:3001
cd ..
npm run start:training
```

### Core Components to Implement

#### 1. Input Encoder (24 inputs)

```javascript
function encodeSelfDamageGameState(gameState) {
  const inputs = [];

  // Self (3)
  inputs.push(gameState.self.x);
  inputs.push(gameState.self.y);
  inputs.push(gameState.self.health / 100);

  // Enemy (3)
  const enemy = gameState.enemies[0] || {};
  inputs.push(enemy.x || 0);
  inputs.push(enemy.y || 0);
  inputs.push((enemy.health || 0) / 100);

  // Terrain (8)
  const terrain = gameState.terrain || [500, 500, 500, 500, 500, 500, 500, 500];
  inputs.push(...terrain);

  // Feedback (10)
  const lastDecision = gameState.lastDecision || {};
  const feedback = gameState.shotFeedback || {};

  inputs.push(lastDecision.actionType === "shoot" ? 1 : 0);
  inputs.push(lastDecision.movement === "left" ? -0.5 : lastDecision.movement === "right" ? 0.5 : 0);
  inputs.push(lastDecision.aimAngle || 0);
  inputs.push(feedback.explosionX || 0);
  inputs.push(feedback.explosionY || 0);
  inputs.push(calculateDistance(gameState.self, { x: feedback.explosionX, y: feedback.explosionY }));
  inputs.push(calculateDistance(enemy, { x: feedback.explosionX, y: feedback.explosionY }));
  inputs.push(feedback.damageTaken || 0);
  inputs.push(feedback.damageDealt || 0);
  inputs.push(feedback.didDamageEnemy ? 1 : 0);

  return inputs; // Must return exactly 24 values!
}
```

#### 2. Fitness Calculator

```javascript
function calculateFitness(gameStats) {
  let fitness = 100;
  let selfDamage = 0;
  let enemyDamage = 0;

  // Extract from turn data
  for (const turn of gameStats.turnData) {
    if (turn.team === 1) {
      selfDamage += turn.inputs.shotFeedback.damageTaken || 0;
      enemyDamage += turn.inputs.shotFeedback.damageDealt || 0;
    }
  }

  // Apply formula
  fitness -= selfDamage * 3;
  fitness += enemyDamage * 5;

  if (gameStats.winner === 1 && enemyDamage > 30) {
    fitness += 150;
  }

  return { fitness, selfDamage, enemyDamage };
}
```

#### 3. Physics Simulation (inject into browser)

```javascript
// See "Physics Simulation" section above for full implementation
window.__simulateBazookaPhysics__ = function (scene, startX, startY, angle, velocity) {
  // ... implementation ...
};
```

#### 4. Training Loop

```javascript
// Initialize NEAT
const neat = new Neat(24, 3, null, {
  popsize: 20,
  mutationRate: 0.2,
  elitism: 10,
});

// Training loop
for (let gen = 1; gen <= 10; gen++) {
  for (let network of neat.population) {
    // Play games
    const results = await playGames(network);

    // Calculate fitness
    network.score = average(results.map(r => r.fitness));
  }

  neat.sort();
  neat.evolve();

  if (gen % 5 === 0) {
    await saveCheckpoint(neat, gen);
  }
}
```

### Critical Implementation Details

1. **Input Order MUST NOT CHANGE** - Breaks all trained models
2. **Physics parameters must match game exactly** - velocity=15, gravity=1.5
3. **Save full population in checkpoints** - Not just best network
4. **Use PhysicsManager.isExplosionBlocked** - For terrain blocking checks
5. **DAMAGE_RADIUS = 140px** - Bazooka explosion radius
6. **Feedback comes from shotFeedback** - Not health deltas

### Testing Your Implementation

```bash
# Quick test (1 network, 3 games, visible browser)
node self-damage-trainer.js --test --headed

# Check for:
# - Network actually shoots (not just moves)
# - Look-ahead finds valid angles
# - Physics predictions are accurate (<20px error)
# - Fitness calculations are reasonable (100-500 range)
# - Checkpoints save and load correctly
```

---

## Appendix: Common Issues

### Issue 1: Physics Mismatch

**Symptom**: Predicted landing 300px off from actual  
**Cause**: Using `lastValidPos` instead of `tempBody.position`  
**Fix**: Return current collision point, not previous step's position

### Issue 2: Stuck Shooting Same Angle

**Symptom**: AI shoots same useless angle repeatedly  
**Cause**: Using custom line-of-sight instead of PhysicsManager  
**Fix**: Use `PhysicsManager.isExplosionBlocked` for terrain checks

### Issue 3: Only Moving, Never Shooting

**Symptom**: Network chooses move on every turn  
**Cause**: DAMAGE_RADIUS too small (80px vs actual 140px)  
**Fix**: Set DAMAGE_RADIUS = 140 to match bazooka explosion

### Issue 4: Training Doesn't Resume

**Symptom**: Training starts from Gen 1 even with checkpoints  
**Cause**: Checkpoint population size doesn't match config  
**Fix**: Either match population size or start fresh

### Issue 5: Browser Tabs Crash

**Symptom**: Puppeteer tabs close unexpectedly  
**Cause**: Too many parallel tabs or memory leak  
**Fix**: Reduce `--tabs` to 4 or restart between sessions

---

**END OF DOCUMENTATION**

This document contains everything needed to rebuild the AI training system from scratch. For questions or issues, refer to the source code or create detailed bug reports with reproduction steps.
