/**
 * HealthBarManager.js - Health bar logic and state management
 * Handles health calculations, updates, and game over logic
 */

class HealthBarManager {
  static instance = null;

  constructor() {
    this.healthBars = []; // Visual bar graphics
    this.playerHealth = []; // Health values for all players (dynamic)
    this.players = []; // Reference to actual player objects
  }

  static getInstance() {
    if (!HealthBarManager.instance) {
      HealthBarManager.instance = new HealthBarManager();
    }
    return HealthBarManager.instance;
  }

  // Apply damage to a player and check for game over
  applyDamage(playerId, damage) {
    const oldHealth = this.playerHealth[playerId - 1];
    this.playerHealth[playerId - 1] = Math.max(0, oldHealth - damage);

    // Check for game over
    if (this.playerHealth[playerId - 1] <= 0) {
      this.triggerGameOver(playerId);
    }

    // Update visual display
    this.updateHealthDisplay();
  }

  // Get current health for a player
  getHealth(playerId) {
    return this.playerHealth[playerId - 1];
  }

  // Set health for a player (for healing, etc.)
  setHealth(playerId, health) {
    this.playerHealth[playerId - 1] = Math.max(0, Math.min(100, health));
    this.updateHealthDisplay();
  }

  // Trigger game over when a player reaches 0 health
  triggerGameOver(defeatedPlayerId) {
    // Check if the defeated player's team is now eliminated
    const defeatedTeam = this.playerTeams[defeatedPlayerId - 1];
    const isTeamEliminated = this.isTeamEliminated(defeatedTeam);

    if (isTeamEliminated) {
      // Find the winning team (the one that still has players alive)
      const winningTeam = this.getWinningTeam();

      // Let GameScene handle the game over UI
      if (window.currentGameScene && window.currentGameScene.endGame) {
        window.currentGameScene.endGame(winningTeam); // Pass winning team instead of individual player
      }
    }
  }

  // Check if a team has been completely eliminated
  isTeamEliminated(teamId) {
    // Find all players on this team
    const teamPlayers = this.playerTeams
      .map((playerTeam, index) => ({ team: playerTeam, playerId: index + 1 }))
      .filter((player) => player.team === teamId);

    // Check if all players on this team have 0 health
    return teamPlayers.every((player) => this.getHealth(player.playerId) <= 0);
  }

  // Get the team that has won (the team with at least one living player)
  getWinningTeam() {
    const uniqueTeams = [...new Set(this.playerTeams)];

    // Find teams that still have living players
    const survivingTeams = uniqueTeams.filter((teamId) => {
      return !this.isTeamEliminated(teamId);
    });

    // In a standard game, there should be exactly one surviving team
    if (survivingTeams.length === 1) {
      return survivingTeams[0];
    }

    // Fallback for edge cases (shouldn't happen in normal gameplay)
    console.warn(
      "⚠️ Multiple teams surviving - returning first surviving team"
    );
    return survivingTeams[0] || 1;
  }

  // Reset health for new game
  resetHealth() {
    // Reset all players to full health
    this.playerHealth.fill(100);
  }

  // Initialize health system for given number of players
  initializeHealthForPlayers(playerList) {
    this.players = playerList;
    this.playerHealth = new Array(playerList.length).fill(100);
    // Initialize basic team system (can be extended for more complex team setups)
    this.playerTeams = playerList.map((player, index) =>
      index % 2 === 0 ? 1 : 2
    ); // Alternate teams for simple 1v1, 2v2, etc.

    this.playerHealth.forEach((health, index) => {
      const playerNum = index + 1;
      const team = this.playerTeams[index];
    });
  }

  // Update the visual health bars (calls the renderer)
  updateHealthDisplay() {
    if (
      HealthBarRenderer &&
      typeof HealthBarRenderer.updateBars === "function"
    ) {
      HealthBarRenderer.updateBars(this.healthBars, this.playerHealth);
    } else {
      console.warn("⚠️ HealthBarRenderer.updateBars not available");
    }
  }

  // Initialize health bars (creates the visuals)
  initializeHealthBars(scene, numPlayers = 2) {
    if (
      HealthBarRenderer &&
      typeof HealthBarRenderer.createBars === "function"
    ) {
      this.healthBars = HealthBarRenderer.createBars(scene, numPlayers);
      this.resetHealth();
      HealthBarRenderer.updateBars(this.healthBars, this.playerHealth);
    } else {
      console.warn("⚠️ HealthBarRenderer not available for initialization");
    }
  }
}

window.HealthBarManager = HealthBarManager;
