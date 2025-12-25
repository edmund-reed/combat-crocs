// Network Analysis Module
// Provides insights into what neural networks are learning

/**
 * Analyze a neural network's connection weights and structure
 * @param {Network} network - Neataptic network to analyze
 * @returns {Object} Analysis results
 */
export function analyzeNetwork(network) {
  const connections = [];
  const nodes = network.nodes;

  // Gather all connections with their weights
  nodes.forEach((node, nodeIdx) => {
    if (node.connections?.out) {
      node.connections.out.forEach(conn => {
        const fromNode = node;
        const toNode = conn.to;

        connections.push({
          from: getNodeLabel(fromNode, nodeIdx),
          to: getNodeLabel(toNode, nodes.indexOf(toNode)),
          weight: conn.weight,
          absWeight: Math.abs(conn.weight),
        });
      });
    }
  });

  // Sort by absolute weight (most influential first)
  connections.sort((a, b) => b.absWeight - a.absWeight);

  return {
    totalConnections: connections.length,
    topConnections: connections.slice(0, 10),
    inputInfluence: calculateInputInfluence(connections),
    networkComplexity: connections.length / nodes.length,
  };
}

/**
 * Calculate which inputs have the most influence on the output
 */
function calculateInputInfluence(connections) {
  const inputInfluence = {};

  connections.forEach(conn => {
    // Only track connections FROM input nodes
    if (conn.from.startsWith("input_")) {
      const inputName = conn.from.replace("input_", "");
      if (!inputInfluence[inputName]) {
        inputInfluence[inputName] = 0;
      }
      inputInfluence[inputName] += conn.absWeight;
    }
  });

  // Normalize to 0-1 scale
  const maxInfluence = Math.max(...Object.values(inputInfluence), 0.001);
  Object.keys(inputInfluence).forEach(key => {
    inputInfluence[key] = inputInfluence[key] / maxInfluence;
  });

  return inputInfluence;
}

/**
 * Get human-readable label for a node
 * CRITICAL: Must match exact order from encodeSelfDamageGameState() in trainer
 */
function getNodeLabel(node, index) {
  if (node.type === "input") {
    // UPDATED: Correct 23-input architecture labels
    const inputLabels = [
      "selfX", // 0
      "selfY", // 1
      "selfHealthPercent", // 2
      "enemyX", // 3
      "enemyY", // 4
      "enemyHealthPercent", // 5
      "lastAimAngle", // 6
      "explosionX", // 7
      "explosionY", // 8
      "explosionDistance", // 9
      "damageTaken", // 10
      "terrainRight", // 11
      "terrainUpRight", // 12
      "terrainUp", // 13
      "terrainUpLeft", // 14
      "terrainLeft", // 15
      "terrainDownLeft", // 16
      "terrainDown", // 17
      "terrainDownRight", // 18
      "timeRemaining", // 19
      "bazookaAmmo", // 20
      "grenadeAmmo", // 21
      "shotgunAmmo", // 22
    ];
    return `input_${inputLabels[node.index] || index}`;
  } else if (node.type === "output") {
    return "output_aimAngle";
  } else {
    return `hidden_${index}`;
  }
}

/**
 * Compare two generations to identify what changed
 */
export function compareGenerations(gen1Analysis, gen2Analysis) {
  const changes = {
    connectionDelta: gen2Analysis.totalConnections - gen1Analysis.totalConnections,
    inputInfluenceChanges: {},
  };

  // Compare input influences
  Object.keys(gen1Analysis.inputInfluence).forEach(input => {
    const oldVal = gen1Analysis.inputInfluence[input] || 0;
    const newVal = gen2Analysis.inputInfluence[input] || 0;
    const change = newVal - oldVal;

    if (Math.abs(change) > 0.1) {
      changes.inputInfluenceChanges[input] = {
        old: oldVal.toFixed(2),
        new: newVal.toFixed(2),
        change: change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
      };
    }
  });

  return changes;
}

/**
 * Generate a human-readable summary of network analysis
 */
export function generateAnalysisSummary(analysis, generation) {
  const lines = [];

  lines.push(`\n🔬 Gen ${generation} Network Analysis:`);
  lines.push(`  Connections: ${analysis.totalConnections}`);
  lines.push(`  Complexity: ${analysis.networkComplexity.toFixed(2)}`);

  lines.push(`\n  📊 Top Input Influences:`);
  const sortedInputs = Object.entries(analysis.inputInfluence)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  sortedInputs.forEach(([input, influence]) => {
    const bar = "█".repeat(Math.round(influence * 10));
    lines.push(`    ${input.padEnd(20)} ${bar} ${(influence * 100).toFixed(0)}%`);
  });

  lines.push(`\n  🔗 Strongest Connections:`);
  analysis.topConnections.slice(0, 5).forEach(conn => {
    const sign = conn.weight > 0 ? "+" : "";
    lines.push(`    ${conn.from.padEnd(20)} → ${conn.to.padEnd(20)} ${sign}${conn.weight.toFixed(3)}`);
  });

  return lines.join("\n");
}
