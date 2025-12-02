// Player utilities for Combat Crocs

import { Config } from "@config";
import { SpawnManager } from "@player";
import { GameStateManager, Logger } from "@utils";
import { PhysicsManager } from "@utils";

class PlayerManager {
  static getSpriteForPlayer = id => {
    if (typeof id === "string" && id.length >= 2) {
      const teamId = parseInt(id.charAt(0));
      const sprites = ["croc1", "croc2", "chameleon1", "gecko1"];
      return sprites[(teamId - 1) % sprites.length];
    }
    return id === 1 ? "croc1" : "croc2"; // Legacy fallback
  };

  static createHitAreaMarker = scene => {
    const marker = scene.add.graphics().lineStyle(2, 0x00ff00, 0.7).strokeCircle(0, 0, 25);
    marker.setDepth(-1);
    return marker;
  };

  static createPhysicsBody = (scene, x, y) => PhysicsManager.createPlayerBody(scene, x, y);

  static createPlayer = (scene, id, x, y, color) => {
    const spriteKey = this.getSpriteForPlayer(id);
    const teamId = parseInt(id.charAt(0));
    const shouldFaceLeft = teamId % 2 === 0;

    Logger.playerAction(`Creating Player ${id} with sprite: ${spriteKey}`);

    const playerSprite = scene.add.sprite(x, y, spriteKey);
    playerSprite.setScale(0.12).setOrigin(0.5, 0.7).setFlipX(shouldFaceLeft);

    const hitAreaMarker = this.createHitAreaMarker(scene);
    const body = this.createPhysicsBody(scene, x, y);

    Logger.playerAction(`Created ${spriteKey} at (${x}, ${y}), facing ${shouldFaceLeft ? "left" : "right"}`);

    return {
      id,
      graphics: playerSprite,
      body,
      hitAreaMarker,
      x,
      y,
      health: 100,
      color,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
      facingLeft: shouldFaceLeft,
    };
  };

  static updatePositionSync = player => {
    const { position } = player.body;
    player.x = position.x;
    player.y = position.y;
    player.graphics.setPosition(player.x, player.y);
  };

  static updateHitAreaMarker = player => {
    if (!player.hitAreaMarker) return;
    player.hitAreaMarker.setPosition(player.x, player.y).clear();
    player.hitAreaMarker.lineStyle(2, 0x00ff00, 0.7).strokeCircle(0, 0, 25);
  };

  // Update player physics (gravity, velocity) for ALL players - called every frame
  static updatePlayerPhysics = (scene, player) => {
    this.updatePositionSync(player);

    if (player.x < 30 || player.x > Config.GAME_WIDTH - 30) {
      const clampedX = Math.max(35, Math.min(Config.GAME_WIDTH - 35, player.x));
      scene.matter.body.setPosition(player.body, { x: clampedX, y: player.y });
      player.x = clampedX;
      player.graphics.setPosition(player.x, player.y);
    }
  };

  // Reset player for new turn
  static resetForTurn = player => Object.assign(player, { canMove: false, canShoot: false });

  // Setup player for their turn
  static activateForTurn = player => Object.assign(player, { canMove: true, canShoot: true });

  // Assign random spawn positions to all players (delegated to SpawnManager)
  static assignRandomSpawnPositions = (scene, players) => SpawnManager.assignRandomSpawnPositions(scene, players);

  // Check if a player at the given index is alive
  static isPlayerAlive = (scene, playerIndex) =>
    playerIndex >= 0 && playerIndex < scene.players.length && scene.players[playerIndex].health > 0;

  // Find player index by player ID
  static getPlayerIndexById = (scene, playerId) => scene.players.findIndex(player => player.id === playerId);

  // Get team color with fallback
  static getTeamColor = (team, teamIndex) => team.color?.hex ?? (teamIndex % 5) + 1;

  // Create players for a specific team
  static createTeamPlayers = (scene, team, teamIndex, spawnY) => {
    const teamColor = this.getTeamColor(team, teamIndex);
    Logger.playerAction(`Team ${team.id} using color: 0x${teamColor.toString(16)}`);

    for (let i = 0; i < team.crocCount; i++) {
      const playerId = `${team.id}${i + 1}`;
      const player = this.createPlayer(scene, playerId, 100 + teamIndex * 100 + i * 50, spawnY, teamColor);
      scene.players.push(player);
    }
  };

  // Update scene references after player creation
  static updateSceneReferences = scene => {
    scene.players.forEach(player => {
      scene.playerSprites[player.id] = player.graphics;
      scene.playerBodies[player.id] = player.body;
      player.hitAreaMarker?.setPosition(player.x, player.y);
    });
  };

  // Create all players for the game (moved from GameScene.js)
  static createGamePlayers = scene => {
    const teams = GameStateManager.getTeams();
    scene.players = [];
    scene.playerSprites = {};
    scene.playerBodies = {};

    const spawnY = Config.GAME_HEIGHT - 110; // Ground level with offset

    teams.forEach((team, teamIndex) => this.createTeamPlayers(scene, team, teamIndex, spawnY));

    this.assignRandomSpawnPositions(scene, scene.players);
    this.updateSceneReferences(scene);

    const teamSummary = teams.map(t => `Team ${t.id} (${t.crocCount})`).join(", ");
    Logger.gameEvent(`Created ${scene.players.length} players: ${teamSummary}`);
  };
}

export default PlayerManager;
