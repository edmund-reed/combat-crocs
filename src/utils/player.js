import { Config } from "@config";
import { SpawnManager } from "@player";
import { StateManager, PhysicsManager } from "@utils";
import { CharacterHelper } from "./character-helper";

class PlayerManager {
  static createPlayer = (scene, id, x, y, color, teamWeaponStats, characterType = "CROCODILE") => {
    const teamId = parseInt(id.charAt(0));
    const shouldFaceLeft = teamId % 2 === 0;
    const { width, height } = Config.SPRITE_SIZES.GAME_CHARACTER;
    const scaleFactor = Config.CHARACTER_TYPES[characterType]?.scale || 1.0;

    const player = {
      id,
      teamId,
      characterType,
      color,
      x,
      y,
      health: 100,
      maxHealth: 100,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
      facingLeft: shouldFaceLeft,
      weaponStats: teamWeaponStats,
      weaponSprite: scene.add
        .sprite(x, y, Config.WEAPON_CONFIGS.BAZOOKA.heldSpriteKey || "grenade-l1")
        .setScale(0.04)
        .setVisible(false)
        .setDepth(100),
      graphics: scene.add
        .sprite(x, y, CharacterHelper.getSpriteKey(characterType, color))
        .setDisplaySize(width * scaleFactor, height * scaleFactor)
        .setOrigin(0.5, 0.7)
        .setFlipX(shouldFaceLeft),
      body: PhysicsManager.createPlayerBody(scene, x, y),
      hitAreaMarker: scene.add.graphics().lineStyle(2, 0x00ff00, 0.7).strokeCircle(0, 0, 25).setDepth(-1),

      // Grounded/jump control
      groundContacts: 0,
      jumpLocked: false,
      lastJumpAtMs: 0,
    };

    this.applyCharacterAbility(player, characterType);
    return player;
  };

  static applyCharacterAbility(player, characterType) {
    const ability = Config.CHARACTER_TYPES[characterType]?.ability;
    if (!ability) return;

    if (ability.healthMultiplier) {
      player.health *= ability.healthMultiplier;
      player.maxHealth = player.health;
    }
    if (ability.reviveHealthPercent !== undefined) {
      Object.assign(player, { lastStandUsed: false, inLastStand: false });
    }
    player.ability = ability;
  }

  static updatePositionSync = player => {
    const { x, y } = player.body.position;
    Object.assign(player, { x, y });
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
    const clampedX = Math.max(35, Math.min(Config.GAME_WIDTH - 35, player.x));
    if (clampedX !== player.x) {
      scene.matter.body.setPosition(player.body, { x: clampedX, y: player.y });
      Object.assign(player, { x: clampedX });
      player.graphics.setPosition(clampedX, player.y);
    }
  };

  static resetForTurn = player => Object.assign(player, { canMove: false, canShoot: false });
  static activateForTurn = player => Object.assign(player, { canMove: true, canShoot: true });
  static assignRandomSpawnPositions = (scene, players) =>
    SpawnManager.assignRandomSpawnPositions(scene, players);
  static isPlayerAlive = (scene, i) => i >= 0 && i < scene.players.length && scene.players[i].health > 0;
  static getPlayerIndexById = (scene, id) => scene.players.findIndex(p => p.id === id);

  static createTeamPlayers = (scene, team, teamIndex, spawnY) => {
    const teamColor = team.color?.hex ?? (teamIndex % 5) + 1;
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
    StateManager.initializeTeamWeaponStats(teams);

    Object.assign(scene, { players: [], playerSprites: {}, playerBodies: {} });
    teams.forEach((team, i) => this.createTeamPlayers(scene, team, i, Config.GAME_HEIGHT - 110));
    this.assignRandomSpawnPositions(scene, scene.players);

    scene.players.forEach(p => {
      scene.playerSprites[p.id] = p.graphics;
      scene.playerBodies[p.id] = p.body;
      p.hitAreaMarker?.setPosition(p.x, p.y);
    });
  };
}

export default PlayerManager;
