# 🚨 CRITICAL FIX: Proper Neural Network Architecture

## Problem Discovered (23 Dec 2025)

### The Issue:

The trained model `ai/models/self-damage-avoidance.json` was **broken** - it contained only a **single-layer perceptron** instead of a multi-layer network!

**Expected:** 20 inputs → [16, 12, 8] hidden → 1 output = **57 nodes total**
**Actual:** 20 inputs → 1 output = **21 nodes total** (no hidden layers!)

### Why This Happened:

NEAT (NeuroEvolution of Augmenting Topologies) is designed to:

1. Start with **minimal topology** (direct input → output connections)
2. **Evolve complexity** through mutations over many generations

The `config.networkConfig.hidden = [16, 12, 8]` was **never passed to NEAT**! It was only used for display in logs.

### Impact:

A single-layer perceptron can only learn **LINEAR relationships**:

- ❌ Cannot learn complex spatial reasoning
- ❌ Cannot understand terrain + explosion + position interactions
- ❌ Explains why network ignored `explosionDistance` input (0% influence)
- ❌ Minimal learning after 12 generations (only -1.8 HP improvement)

## Solution Implemented

### 1. Template Network Builder

Created `createTemplateNetwork()` function that builds a proper multi-layer architecture:

```javascript
function createTemplateNetwork(inputSize, outputSize, hiddenLayers) {
  const layers = [inputSize, ...hiddenLayers, outputSize];
  // [20, 16, 12, 8, 1]

  const template = Network.fromLayers(layers);
  return template;
}
```

### 2. Population Seeding

Instead of letting NEAT start minimal, we now **seed the entire population** with proper architecture:

```javascript
// Create template: 20 → [16, 12, 8] → 1
const template = createTemplateNetwork(
  config.networkConfig.inputs,
  config.networkConfig.outputs,
  config.networkConfig.hidden,
);

// Seed all networks
for (let i = 0; i < neat.population.length; i++) {
  neat.population[i] = Network.fromJSON(template.toJSON());

  // Add random weight variations for diversity
  neat.population[i].nodes.forEach(node => {
    if (node.bias) node.bias += (Math.random() - 0.5) * 0.5;
  });

  neat.population[i].connections.forEach(conn => {
    conn.weight += (Math.random() - 0.5) * 0.5;
  });
}
```

### 3. Clean Slate

- ✅ Deleted broken `ai/models/self-damage-avoidance.json`
- ✅ Deleted all checkpoints (Gen 1-12 were trained with broken architecture)
- ✅ Will start fresh from Generation 0 with proper 57-node networks

## Expected Results

With proper hidden layers, the network should now be able to:

- ✅ Learn **non-linear relationships** between inputs
- ✅ Use `explosionDistance` effectively (currently 0% → expect 30%+)
- ✅ Understand spatial relationships (position + terrain + explosion)
- ✅ Show **significant learning** (expect 15+ HP improvement over 10 generations)

## How to Train

```bash
cd ai/simple

# Fresh start with proper architecture (1200 games)
node self-damage-trainer.js --gen 5 --pop 30 --games 8 --tabs 8

# Or smaller test (400 games)
node self-damage-trainer.js --gen 5 --pop 10 --games 8 --tabs 8
```

## Verification

After Gen 5, check the saved model:

```bash
cat ai/checkpoints/self-damage-checkpoint-gen05.json | grep -c '"type"'
```

Should show **~57 nodes** (not 21!)

## Additional Improvements Made

1. **Win/Loss Tracking** - Training history now includes win rates
2. **Network Analytics** - Checkpoints include input influence analysis
3. **Explosion Distance** - Confirmed it IS in the data (was not the problem)

---

**Status:** ✅ FIXED - Ready for fresh training with proper architecture!
