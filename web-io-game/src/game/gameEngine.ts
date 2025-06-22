class GameEngine {
    // Should remove

    private gameState: any; // Replace 'any' with the actual type for game state
    private isRunning: boolean;

    constructor() {
        this.gameState = {}; // Initialize game state
        this.isRunning = false;
    }

    start(): void {
        this.isRunning = true;
        this.gameLoop();
    }

    update(): void {
        if (!this.isRunning) return;
        // Update game logic hereÍ
    }

    reset(): void {
        this.gameState = {}; // Reset game state
    }

    private gameLoop(): void {
        if (!this.isRunning) return;
        this.update();
        requestAnimationFrame(() => this.gameLoop());
    }
}

export default GameEngine;
