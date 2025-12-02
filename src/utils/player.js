import { Config } from "@config";
import { SpawnManager } from "@player";
import { GameStateManager, Logger, PhysicsManager } from "@utils";

class PlayerManager {
  static getSpriteForPlayer = id => {
    if (typeof id === "string" && id.length >= 2) {
      const sprites = ["croc1", "croc2", "chameleon1", "gecko1"];
      return sprites[(parseInt(id.charAt(0)) - 1) % sprites.length];
    }
    return id === 1 ? "croc1" : "croc2";
  };

  static createPlayer = (scene, id, x, y, color) => {
    const spriteKey = this.getSpriteForPlayer(id);
    const teamId = parseInt(id.charAt(0));
    const shouldFaceLeft = teamId % 2 === 0;

    Logger.playerAction(`Creating Player ${id} with sprite: ${spriteKey}`);

    const playerSprite = scene.add.sprite(x, y, spriteKey).setScale(0.12).setOrigin(0.5, 0.7).setFlipX(shouldFaceLeft);
    const hitAreaMarker = scene.add.graphics().lineStyle(2, 0x00ff00, 0.7).strokeCircle(0, 0, 25).setDepth(-1);
    const body = PhysicsManager.createPlayerBody(scene, x, y);

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
    const { x, y } = player.body.position;
    player.x = x;
    player.y = y;
    player.graphics.setPosition(x, y);
  };

  static updateHitAreaMarker = player => {
    player.hitAreaMarker?.setPosition(player.x, player.y).clear().lineStyle(2, 0x00ff00, 0.7).strokeCircle(0, 0, 25);
  };

  static updatePlayerPhysics = (scene, player) => {
    this.updatePositionSync(player);

    if (player.x < 30 || player.x > Config.GAME_WIDTH - 30) {
      const clampedX = Math.max(35, Math.min(Config.GAME_WIDTH - 35, player.x));
      scene.matter.body.setPosition(player.body, { x: clampedX, y: player.y });
      player.x = clampedX;
      player.graphics.setPosition(clampedX, player.y);
    }
  };

  static resetForTurn = player => Object.assign(player, { canMove: false, canShoot: false });
  static activateForTurn = player => Object.assign(player, { canMove: true, canShoot: true });
  static assignRandomSpawnPositions = (scene, players) => SpawnManager.assignRandomSpawnPositions(scene, players);
  static isPlayerAlive = (scene, playerIndex) =>
    playerIndex >= 0 && playerIndex < scene.players.length && scene.players[playerIndex].health > 0;
  static getPlayerIndexById = (scene, playerId) => scene.players.findIndex(p => p.id === playerId);

  static createTeamPlayers = (scene, team, teamIndex, spawnY) => {
    const teamColor = team.color?.hex ?? (teamIndex % 5) + 1;
    Logger.playerAction(`Team ${team.id} using color: 0x${teamColor.toString(16)}`);

    for (let i = 0; i < team.crocCount; i++) {
      const playerId = `${team.id}${i + 1}`;
      scene.players.push(this.createPlayer(scene, playerId, 100 + teamIndex * 100 + i * 50, spawnY, teamColor));
    }
  };

  static createGamePlayers = scene => {
    const teams = GameStateManager.getTeams();
    scene.players = [];
    scene.playerSprites = {};
    scene.playerBodies = {};

    teams.forEach((team, i) => this.createTeamPlayers(scene, team, i, Config.GAME_HEIGHT - 110));

    this.assignRandomSpawnPositions(scene, scene.players);

    scene.players.forEach(p => {
      scene.playerSprites[p.id] = p.graphics;
      scene.playerBodies[p.id] = p.body;
      p.hitAreaMarker?.setPosition(p.x, p.y);
    });

    Logger.gameEvent(
      `Created ${scene.players.length} players: ${teams.map(t => `Team ${t.id} (${t.crocCount})`).join(", ")}`,
    );
  };
}

export default PlayerManager;
