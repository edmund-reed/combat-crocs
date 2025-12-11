import { Config } from "@config";

class WeaponSpriteManager {
  static updateWeaponSpritesForTurn(scene, currentWeapon, currentPlayerIndex) {
    const weaponConfig = Config.WEAPON_CONFIGS[currentWeapon];
    scene.players.forEach((p, i) => {
      if (p.weaponSprite && weaponConfig?.hasHeldSprite) {
        p.weaponSprite.setTexture(weaponConfig.heldSpriteKey);
        p.weaponSprite.setScale(weaponConfig.heldSpriteScale);
        p.weaponSprite.setVisible(i === currentPlayerIndex);
      } else {
        p.weaponSprite?.setVisible(false);
      }
    });
  }

  static updateWeaponSprite(player, weaponConfig, aimAngle) {
    if (!player.weaponSprite || !weaponConfig?.hasHeldSprite) return;

    if (!weaponConfig.projectileUsesHeldSprite) {
      player.weaponSprite.setFlipX(false);
      player.weaponSprite.setFlipY(player.facingLeft);
      const offsetDistance = 12;
      const offsetX = Math.cos(aimAngle) * offsetDistance;
      const offsetY = Math.sin(aimAngle) * offsetDistance;
      player.weaponSprite.setPosition(player.x + offsetX, player.y + offsetY);
      player.weaponSprite.setOrigin(0.2, 0.5);
      player.weaponSprite.setRotation(aimAngle);
    } else {
      player.weaponSprite.setFlipX(player.facingLeft);
      player.weaponSprite.setFlipY(false);
      player.weaponSprite.setOrigin(0.5, 0.5);
      player.weaponSprite.setPosition(player.x + (player.facingLeft ? -24 : 24), player.y - 10);
      player.weaponSprite.setRotation(0);
    }
  }
}

export default WeaponSpriteManager;
