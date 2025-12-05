import { Config } from "@config";
import { SpawnManager } from "@player";
import { StateManager, Logger, PhysicsManager } from "@utils";
import { initWeaponStats } from "@weapons";
import { CharacterHelper } from "./character-helper";

class PlayerManager {
  static createPlayer = (scene, id, x, y, color, teamWeaponStats, characterType = "CROCODILE") => {
    const spriteKey = CharacterHelper.getSpriteKey(characterType, color);
    const teamId = parseInt(id.charAt(0));
    const shouldFaceLeft = teamId % 2 === 0;

    Logger.playerAction(
      `Creating Player ${id} with character type: ${characterType}, color: ${color}, sprite: ${spriteKey}`,
    );

    // Create held weapon sprite (texture will be set when weapon is selected)
    const defaultWeapon = Config.WEAPON_CONFIGS.BAZOOKA;
    const weaponSprite = scene.add
      .sprite(x, y, defaultWeapon.heldSpriteKey || "grenade-l1")
      .setScale(0.04)
      .setVisible(false)
      .setDepth(100);

    const graphics = scene.add.sprite(x, y, spriteKey);
    const baseWidth = Config.SPRITE_SIZES.GAME_CHARACTER.width;
    const baseHeight = Config.SPRITE_SIZES.GAME_CHARACTER.height;
    const scaleFactor = Config.CHARACTER_TYPES[characterType]?.scale || 1.0;

    graphics
      .setDisplaySize(baseWidth * scaleFactor, baseHeight * scaleFactor)
      .setOrigin(0.5, 0.7)
      .setFlipX(shouldFaceLeft);

    return {
      id,
      teamId, // Store team ID for easy team lookup
      graphics,
      body: PhysicsManager.createPlayerBody(scene, x, y),
      hitAreaMarker: scene.add.graphics().lineStyle(2, 0x00ff00, 0.7).strokeCircle(0, 0, 25).setDepth(-1),
      weaponSprite,
      x,
      y,
      health: 100,
      color,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
      facingLeft: shouldFaceLeft,
      weaponStats: teamWeaponStats, // Reference team's weapon stats
    };
  };

  static updatePositionSync = player => {
    const { x, y } = player.body.position;
    player.x = x;
    player.y = y;
    player.graphics.setPosition(x, y);
  };

  static updateHitAreaMarker = player =>
    player.hitAreaMarker
      ?.setPosition(player.x, player.y)
      .clear()
      .lineStyle(2, 0x00ff00, 0.7)
      .strokeCircle(0, 0, 25);

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
  static assignRandomSpawnPositions = (scene, players) =>
    SpawnManager.assignRandomSpawnPositions(scene, players);
  static isPlayerAlive = (scene, playerIndex) =>
    playerIndex >= 0 && playerIndex < scene.players.length && scene.players[playerIndex].health > 0;
  static getPlayerIndexById = (scene, playerId) => scene.players.findIndex(p => p.id === playerId);

  static createTeamPlayers = (scene, team, teamIndex, spawnY) => {
    const teamColor = team.color?.hex ?? (teamIndex % 5) + 1;
    // Pass team's weaponStats reference to all players on the team
    for (let i = 0; i < team.crocCount; i++) {
      const characterType = team.players?.[i]?.characterType || "CROCODILE";
      scene.players.push(
        this.createPlayer(
          scene,
          `${team.id}${i + 1}`,
          100 + teamIndex * 100 + i * 50,
          spawnY,
          teamColor,
          team.weaponStats,
          characterType,
        ),
      );
    }
  };

  static createGamePlayers = scene => {
    const teams = StateManager.getTeams();

    // Initialize weapon stats for all teams BEFORE creating players
    StateManager.initializeTeamWeaponStats(teams);

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
      `Created ${scene.players.length} players: ${teams
        .map(t => `Team ${t.id} (${t.crocCount})`)
        .join(", ")}`,
    );
  };
}

export default PlayerManager;
