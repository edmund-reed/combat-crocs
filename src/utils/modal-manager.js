// Modal Manager for Combat Crocs
class ModalManager {
  static createModalOverlay(scene, closeCallback = null) {
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const overlay = scene.add
      .graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, w, h)
      .setDepth(1000);

    if (closeCallback)
      overlay.setInteractive().on("pointerdown", () => closeCallback());

    scene.modalOverlayActive = true;
    if (!scene.modalOverlays) scene.modalOverlays = [];
    scene.modalOverlays.push(overlay);
    return overlay;
  }

  static clearModalOverlays(scene) {
    scene.modalOverlayActive = false;
    if (scene.modalOverlays) {
      scene.modalOverlays.forEach((overlay) => overlay.destroy());
      scene.modalOverlays = [];
    }
  }

  static isModalOpen(scene) {
    return scene.modalOverlayActive || false;
  }
}

window.ModalManager = ModalManager;
