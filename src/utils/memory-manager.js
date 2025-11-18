// Memory Manager for Phaser Game Objects
// Provides automated resource cleanup to prevent memory leaks

class MemoryManager {
  // Initialize memory management for a Phaser scene
  static initialize(scene) {
    // Initialize cleanup registry - automatic resource management
    scene.resourceRegistry = {
      timeouts: new Set(),
      graphics: new Set(),
      effects: new Set(), // explosions, gravestones, etc.
    };

    // Register cleanup handler (Phaser automatically calls this on scene destroy)
    scene.events.once("destroy", () => this._performCleanupRegistry(scene));

    console.log("🧠 Memory management initialized for scene");
  }

  // Register resources for automatic cleanup
  static registerCleanup(scene, resource, type) {
    if (scene.resourceRegistry[type] && resource) {
      scene.resourceRegistry[type].add(resource);
    }
  }

  // Remove resources from cleanup registry (rarely needed since scene destroy clears all)
  static unregisterCleanup(scene, resource, type) {
    if (scene.resourceRegistry[type] && resource) {
      scene.resourceRegistry[type].delete(resource);
    }
  }

  // Automated cleanup - called automatically by Phaser on scene destruction
  static _performCleanupRegistry(scene) {
    console.log("🔄 Automated cleanup starting...");

    // Clear browser timeouts (grenades, effects)
    scene.resourceRegistry.timeouts.forEach(timeoutId => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    // Cancel Phaser turn timer if active
    if (scene.turnManager?.currentTurnTimer) {
      scene.turnManager.currentTurnTimer.destroy();
      scene.turnManager.currentTurnTimer = null;
    }

    // Destroy Phaser graphics objects
    scene.resourceRegistry.graphics.forEach(graphics => {
      if (graphics && graphics.destroy) graphics.destroy();
    });

    // Destroy special effects (gravestones, explosions, etc.)
    scene.resourceRegistry.effects.forEach(effectData => {
      if (effectData) {
        if (effectData.gravestone) effectData.gravestone.destroy();
        if (effectData.ripText) effectData.ripText.destroy();
      }
    });

    console.log("✅ Automated cleanup complete");
  }
}

window.MemoryManager = MemoryManager;
