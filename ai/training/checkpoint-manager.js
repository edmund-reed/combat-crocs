// Checkpoint Manager - Save and load training progress
// Saves FULL POPULATION (not just best network) for true resumption

import fs from "fs";
import path from "path";

/**
 * Get the last generation number from checkpoints
 * @returns {Promise<number>} - Last generation number (0 if none)
 */
export async function getLastGenerationNumber() {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");

  try {
    const files = await fs.promises.readdir(checkpointDir);
    const checkpointFiles = files
      .filter(f => f.startsWith("self-damage-checkpoint-gen") && f.endsWith(".json"))
      .map(f => {
        const match = f.match(/gen(\d+)\.json$/);
        return match ? parseInt(match[1]) : 0;
      });

    return checkpointFiles.length > 0 ? Math.max(...checkpointFiles) : 0;
  } catch (error) {
    // Directory doesn't exist or is empty
    return 0;
  }
}

/**
 * Save checkpoint with full population
 * @param {Object} neat - NEAT algorithm instance
 * @param {number} generation - Current generation number
 * @param {Object} stats - Generation statistics
 */
export async function saveCheckpoint(neat, generation, stats) {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");
  await fs.promises.mkdir(checkpointDir, { recursive: true });

  const checkpoint = {
    generation: generation,
    timestamp: new Date().toISOString(),
    population: neat.population.map(net => net.toJSON()), // CRITICAL: Save entire population
    stats: {
      bestFitness: stats.bestFitness,
      avgFitness: stats.avgFitness,
      avgSelfDamage: stats.avgSelfDamage,
      bestSelfDamage: stats.bestSelfDamage,
    },
    networkAnalysis: stats.networkAnalysis,
    config: {
      populationSize: neat.population.length,
      mutationRate: neat.mutationRate,
      networkArchitecture: stats.networkArchitecture || [24, 16, 10],
    },
  };

  const filename = `self-damage-checkpoint-gen${String(generation).padStart(2, "0")}.json`;
  const filepath = path.join(checkpointDir, filename);
  await fs.promises.writeFile(filepath, JSON.stringify(checkpoint, null, 2));

  console.log(`  💾 Checkpoint saved: ${filename} (full population: ${neat.population.length} networks)`);
}

/**
 * Load the latest checkpoint
 * @returns {Promise<Object|null>} - Checkpoint data or null
 */
export async function loadFromCheckpoint() {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");

  try {
    const files = await fs.promises.readdir(checkpointDir);
    const checkpointFiles = files
      .filter(f => f.startsWith("self-damage-checkpoint-gen") && f.endsWith(".json"))
      .map(f => {
        const match = f.match(/gen(\d+)\.json$/);
        return { filename: f, generation: match ? parseInt(match[1]) : 0 };
      })
      .sort((a, b) => b.generation - a.generation); // Sort descending

    if (checkpointFiles.length === 0) {
      return null; // No checkpoints found
    }

    // Load the latest checkpoint
    const latestCheckpoint = checkpointFiles[0];
    const filepath = path.join(checkpointDir, latestCheckpoint.filename);
    const checkpointData = await fs.promises.readFile(filepath, "utf-8");
    const checkpoint = JSON.parse(checkpointData);

    return {
      generation: checkpoint.generation,
      population: checkpoint.population,
      stats: checkpoint.stats,
    };
  } catch (error) {
    console.log(`  ⚠️  Error loading checkpoint: ${error.message}`);
    return null;
  }
}

/**
 * Delete old checkpoints (keep last 2)
 * @param {number} currentGen - Current generation number
 */
export async function cleanupOldCheckpoints(currentGen) {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");

  try {
    const files = await fs.promises.readdir(checkpointDir);
    const checkpointFiles = files
      .filter(f => f.startsWith("self-damage-checkpoint-gen") && f.endsWith(".json"))
      .map(f => {
        const match = f.match(/gen(\d+)\.json$/);
        return { filename: f, generation: match ? parseInt(match[1]) : 0 };
      })
      .sort((a, b) => b.generation - a.generation); // Sort descending

    // Keep only last 2 checkpoints (full population takes more space)
    const toDelete = checkpointFiles.slice(2);

    for (const file of toDelete) {
      const filepath = path.join(checkpointDir, file.filename);
      await fs.promises.unlink(filepath);
      console.log(`  🗑️  Deleted old checkpoint: ${file.filename}`);
    }
  } catch (error) {
    // Directory doesn't exist or other error - ignore
  }
}

/**
 * Save best model (used after training completion)
 * @param {Object} network - Best network
 * @param {string} modelName - Model filename (without .json)
 */
export async function saveBestModel(network, modelName = "self-damage-avoidance") {
  const modelPath = path.join(process.cwd(), `../../ai/models/${modelName}.json`);
  await fs.promises.mkdir(path.dirname(modelPath), { recursive: true });
  await fs.promises.writeFile(modelPath, JSON.stringify(network.toJSON(), null, 2));
  console.log(`\n💾 Best network saved to: ai/models/${modelName}.json`);
}

/**
 * Load best model (for testing or resuming)
 * @param {string} modelName - Model filename (without .json)
 * @returns {Promise<Object|null>} - Model JSON or null
 */
export async function loadBestModel(modelName = "self-damage-avoidance") {
  const modelPath = path.join(process.cwd(), `../../ai/models/${modelName}.json`);
  try {
    const modelData = await fs.promises.readFile(modelPath, "utf-8");
    return JSON.parse(modelData);
  } catch (error) {
    return null; // No existing model
  }
}
