import Phaser from "phaser";

const FOOD_PALETTE = [
    0x00ff88, 0xff3388, 0xffaa00, 0x00ccff, 0xff6644, 0x88ff00, 0xff00ff, 0x00ffff, 0xffff00, 0xff4466,
];

function colorFromId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return FOOD_PALETTE[hash % FOOD_PALETTE.length];
}

export default class FoodUI {
    public id: string;
    public sprite: Phaser.GameObjects.Arc;
    private glowSprite: Phaser.GameObjects.Arc;
    private pulseTween?: Phaser.Tweens.Tween;
    private baseRadius: number;

    constructor(id: string, scene: Phaser.Scene, x: number, y: number, radius: number, color: number) {
        this.id = id;
        this.baseRadius = radius;
        const displayColor = colorFromId(id) || color;

        this.glowSprite = scene.add.circle(x, y, radius * 2.05, displayColor, 0.2);
        this.glowSprite.setDepth(98);

        this.sprite = scene.add.circle(x, y, radius, displayColor);
        this.sprite.setStrokeStyle(2, 0xffffff, 0.3);
        this.sprite.setDepth(100);

        // Arcade Physics 적용(충돌 등)
        scene.physics.add.existing(this.sprite, false);

        // 충돌 판정용 hitArea를 원으로 지정
        this.sprite.body.setCircle(radius);

        const pulseState = { t: 0 };
        this.pulseTween = scene.tweens.add({
            targets: pulseState,
            t: 1,
            duration: 700 + Math.floor(Math.random() * 320),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            onUpdate: () => {
                const coreRadius = this.baseRadius * (1 + pulseState.t * 0.2);
                const glowRadius = this.baseRadius * (1.95 + pulseState.t * 0.35);
                this.sprite.setRadius(coreRadius);
                this.glowSprite.setRadius(glowRadius);
            },
        });
    }

    move(dx: number, dy: number) {
        this.sprite.x += dx;
        this.sprite.y += dy;
        this.glowSprite.x += dx;
        this.glowSprite.y += dy;
    }

    beEaten() {
        // 먹혔을 때의 처리 로직 (예: 애니메이션, 사운드 등)
        this.destroy();
    }

    destroy() {
        this.pulseTween?.stop();
        this.glowSprite.destroy();
        this.sprite.destroy();
    }
}
