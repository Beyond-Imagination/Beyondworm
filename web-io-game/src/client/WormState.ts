import { GAME_CONSTANTS } from "./constants";
import { MovementStrategy } from "./MovementStrategy";

export type WormType = "player" | "playerTrackerBot" | "foodSeekerBot";

export class WormState {
    public lastVel: Phaser.Math.Vector2;
    public lastHead: Phaser.Math.Vector2;
    public targetSegmentRadius: number;
    public segments: Phaser.GameObjects.Arc[];
    public path: Phaser.Math.Vector2[];
    public segmentColor: number;
    public movementStrategy: MovementStrategy;
    public nextTarget: Phaser.GameObjects.Arc | null; // 다음 목표물

    private boundBox: { minX: number, maxX: number, minY: number, maxY: number };

    constructor(segmentColor: number, movementStrategy: MovementStrategy) {
        this.lastVel = new Phaser.Math.Vector2(0, 1); // 초기 방향은 아래로
        this.lastHead = new Phaser.Math.Vector2();
        this.targetSegmentRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        this.segments = [];
        this.path = [];
        this.segmentColor = segmentColor;
        this.movementStrategy = movementStrategy; // 전략 할당
        this.nextTarget = null; // 초기에는 목표 없음
        this.boundBox = { minX: 0, maxX: 0, minY: 0, maxY: 0 }; // 바운드 박스 초기화
    }

    calculateDesiredDirection() {
        const head = this.segments[0];
        const desiredDir = new Phaser.Math.Vector2(
            this.nextTarget!!.x - head.x,
            this.nextTarget!!.y - head.y
        );
        return desiredDir.length() > 0 ? desiredDir.normalize() : Phaser.Math.Vector2.ZERO;
    }

    // 반지름 크기를 포함한 BoundBox값 반환
    getBoundBox(): { minX: number, maxX: number, minY: number, maxY: number } {
        return {
            minX: this.boundBox.minX - this.targetSegmentRadius,
            maxX: this.boundBox.maxX + this.targetSegmentRadius,
            minY: this.boundBox.minY - this.targetSegmentRadius,
            maxY: this.boundBox.maxY + this.targetSegmentRadius
        };
    }

    // path에 새 좌표 추가 시 호출
    updateBoundBoxOnAdd(vec: Phaser.Math.Vector2) {
        this.boundBox.minX = Math.min(this.boundBox.minX, vec.x);
        this.boundBox.maxX = Math.max(this.boundBox.maxX, vec.x);
        this.boundBox.minY = Math.min(this.boundBox.minY, vec.y);
        this.boundBox.maxY = Math.max(this.boundBox.maxY, vec.y);
    }

    // path에서 좌표가 잘려나갈 때 호출
    updateBoundBoxOnRemove(removedVec: Phaser.Math.Vector2) {
        // 만약 잘려나간 좌표가 minX/maxX/minY/maxY 중 하나였다면 전체 재계산
        if (
            removedVec.x === this.boundBox.minX ||
            removedVec.x === this.boundBox.maxX ||
            removedVec.y === this.boundBox.minY ||
            removedVec.y === this.boundBox.maxY
        ) {
            // 전체 path/segments를 순회해서 boundBox 재계산
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const seg of this.segments) {
                if (seg.x < minX) minX = seg.x;
                if (seg.x > maxX) maxX = seg.x;
                if (seg.y < minY) minY = seg.y;
                if (seg.y > maxY) maxY = seg.y;
            }
            this.boundBox = { minX, maxX, minY, maxY };
        }
        // 아니라면 boundBox는 그대로 둬도 됨
    }
}
