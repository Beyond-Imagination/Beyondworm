import Phaser from "phaser";

export default class Food {
    public sprite: Phaser.GameObjects.Arc; // 추후 이미지를 위해 Arc 대신 Sprite로 변경 가능
    private scene: Phaser.Scene; // scene 참조를 저장

    constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 30, color: number = 0xff3333) {
        this.scene = scene; // scene 참조 저장
        // Phaser의 Arc(원) 오브젝트 생성
        this.sprite = scene.add.circle(x, y, radius, color);
        this.sprite.setStrokeStyle(4, 0x880000);
        this.sprite.setDepth(100);

        // Arcade Physics 적용(충돌 등)
        scene.physics.add.existing(this.sprite, false);

        // 충돌 판정용 hitArea를 원으로 지정
        this.sprite.body.setCircle(radius);
    }

    move(dx: number, dy: number) {
        this.sprite.x += dx;
        this.sprite.y += dy;
    }

    beEaten() {
        // 먹혔을 때의 처리 로직 (예: 애니메이션, 사운드 등)
        this.destroy();
    }

    destroy() {
        this.sprite.destroy();
    }
}