import { WormType } from "@beyondworm/shared";

export class WormState {
    public segments: Phaser.GameObjects.Arc[];
    public isSprinting: boolean;
    public wormType: WormType; // 지렁이 타입 추가

    constructor(segments: Phaser.GameObjects.Arc[], wormType: WormType) {
        this.segments = segments || [];
        this.isSprinting = false;
        this.wormType = wormType;
    }
}
