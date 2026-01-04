// Logger - Training history and input log management
import fs from "fs";
import path from "path";

// In-memory storage for current training session
const inputLogs = [];
let currentGameLog = null;

/**
 * Start logging a game
 * @param {number} network - Network number
 * @param {number} generation - Current generation
 * @param {string} map - Map name
 * @param {number} gameNum - Game number
 */
export function startGameLog(network, generation, map, gameNum) {
  currentGameLog = {
    gameId: `game-${Date.now()}-${gameNum}`,
    network: network,
    generation: generation,
    map: map,
    turns: [],
  };
}

/**
 * Log turn inputs (currently unused - data comes from browser)
 */
export function logTurnInputs(turnNumber, gameState, inputArray, decision) {
  if (!currentGameLog) return;
  // Turn data now comes directly from browser via gameStats.turnData
}

/**
 * End game log and add to collection
 * @param {number} fitness - Final fitness score
 * @param {number} selfDamage - Total self-damage
 */
export function endGameLog(fitness, selfDamage) {
  if (!currentGameLog) return;

  currentGameLog.result = {
    selfDamage,
    fitness,
  };

  inputLogs.push(currentGameLog);
  currentGameLog = null;
}

/**
 * Add complete game log with turn data
 * @param {Object} gameLog - Complete game log
 */
export function addGameLog(gameLog) {
  inputLogs.push(gameLog);
}

/**
 * Save input logs to disk
 * @param {number} logLimit - Maximum number of logs to save
 */
export async function saveInputLogs(logLimit = 10) {
  if (inputLogs.length === 0) return;

  const logDir = path.join(process.cwd(), "../../ai/data/input-logs");
  await fs.promises.mkdir(logDir, { recursive: true });

  // Only save first N logs (respect limit)
  const logsToSave = inputLogs.slice(0, Math.min(logLimit, inputLogs.length));

  for (const log of logsToSave) {
    const filename = `${log.gameId}.json`;
    const filepath = path.join(logDir, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(log, null, 2));
  }

  console.log(`\n💾 Saved ${logsToSave.length} input log files to: ai/data/input-logs/`);
  inputLogs.length = 0; // Clear logs
}

/**
 * Clear all input logs from memory
 */
export function clearInputLogs() {
  inputLogs.length = 0;
  currentGameLog = null;
}

/**
 * Save training history to disk
 * @param {Array<Object>} generationStats - Statistics for each generation
 * @param {number} startingGen - Starting generation number
 * @param {number} startTime - Training start time (timestamp)
 */
export async function saveTrainingHistory(generationStats, startingGen, startTime) {
  const historyPath = path.join(process.cwd(), "../../ai/analysis/training-history.json");
  await fs.promises.mkdir(path.dirname(historyPath), { recursive: true });

  let history = { trainingSessions: [] };

  // Load existing history if it exists
  try {
    const existing = await fs.promises.readFile(historyPath, "utf-8");
    history = JSON.parse(existing);
  } catch (error) {
    // File doesn't exist yet
  }

  // Calculate win/loss ratios across all generations
  const totalWins = generationStats.reduce((sum, stat) => sum + (stat.wins || 0), 0);
  const totalGames = generationStats.reduce((sum, stat) => sum + (stat.gamesPlayed || 0), 0);
  const winRate = totalGames > 0 ? totalWins / totalGames : 0;

  // Add this training session
  const session = {
    sessionId: Date.now(),
    startTime: new Date(startTime).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: ((Date.now() - startTime) / 1000 / 60).toFixed(1),
    config: {
      population: generationStats[0]?.populationSize || 20,
      generations: generationStats.length,
      gamesPerNetwork: generationStats[0]?.gamesPerNetwork || 6,
    },
    winLossStats: {
      totalGames: totalGames,
      totalWins: totalWins,
      winRate: winRate.toFixed(3),
    },
    generations: generationStats.map((stat, idx) => ({
      generationInSession: stat.generation,
      cumulativeGeneration: startingGen + stat.generation,
      stats: {
        bestFitness: stat.bestFitness,
        avgFitness: stat.avgFitness,
        avgSelfDamage: stat.avgSelfDamage,
        bestSelfDamage: stat.bestSelfDamage,
        wins: stat.wins || 0,
        winRate: stat.gamesPlayed > 0 ? (stat.wins / stat.gamesPlayed).toFixed(3) : "0.000",
      },
      networkAnalysis: stat.networkAnalysis,
      regressionDetected: idx > 0 && stat.avgSelfDamage > generationStats[idx - 1].avgSelfDamage,
      improvement: idx > 0 ? generationStats[idx - 1].avgSelfDamage - stat.avgSelfDamage : 0,
    })),
  };

  history.trainingSessions.push(session);

  // Keep only the last 5 sessions to prevent file bloat
  if (history.trainingSessions.length > 5) {
    history.trainingSessions = history.trainingSessions.slice(-5);
    console.log(`\n🗑️  Trimmed training history to last 5 sessions`);
  }

  await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2));
  console.log(`\n📊 Training history saved to: ai/analysis/training-history.json`);
}
