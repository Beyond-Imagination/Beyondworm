import Phaser from "phaser";

export default class WormScene extends Phaser.Scene {
    private segments!: Phaser.GameObjects.Arc[];

    private readonly headSpeed = 350; // 머리가 전진하는 속도
    private readonly segmentSpacing = 18; // 각 세그먼트 간격
    private readonly segmentCount = 25; // 세그먼트 개수

    private lastVel = new Phaser.Math.Vector2(0, 0); // 초기 속도는 0
    private prevPointer = new Phaser.Math.Vector2();

    create() {
        const {width, height} = this.scale;

        this.segments = [];
        for (let i = 0; i < this.segmentCount; i++) {
            this.segments.push(
                this.add.circle(
                    width / 2,
                    height / 2 + i * this.segmentSpacing,
                    10,
                    0xaaff66
                )
            );
        }

        // 포인터 초기 좌표 기억
        this.prevPointer.set(this.input.activePointer.worldX, this.input.activePointer.worldY);
        let targetVel = new Phaser.Math.Vector2();
        const pointer = this.input.activePointer;
        const head = this.segments[0];
        targetVel
            .set(pointer.worldX - head.x, pointer.worldY - head.y)
            .normalize();
        this.lastVel.copy(targetVel);
    }

    update(_t: number, deltaMs: number) {
        const dt = deltaMs / 1000;
        const pointer = this.input.activePointer;
        const head = this.segments[0];

        /* ---------- 1) 머리 움직임 ---------- */
        // 포인터가 얼마나 이동했는지 검사
        const movedX = pointer.worldX - this.prevPointer.x;
        const movedY = pointer.worldY - this.prevPointer.y;
        const movedDistSq = movedX * movedX + movedY * movedY;

        const epsilonSq = 1; // 움직임이 1px² 이하면 '정지' 간주
        let targetVel = new Phaser.Math.Vector2();

        if (movedDistSq > epsilonSq) {
            /** ★ 변경 포인트
             *   포인터가 움직였다면:
             *   → '머리 → 포인터' 방향으로 선회
             */
            targetVel
                .set(pointer.worldX - head.x, pointer.worldY - head.y)
                .normalize();

            this.lastVel.copy(targetVel);      // 향후 정지 상태용
        } else {
            // 포인터가 멈춤 → 마지막 방향으로 직진
            targetVel.copy(this.lastVel);
        }

        // 머리 전진
        head.x += targetVel.x * this.headSpeed * dt;
        head.y += targetVel.y * this.headSpeed * dt;

        // 포인터 좌표 기록
        this.prevPointer.set(pointer.worldX, pointer.worldY);

        /* ---------- 2) 몸통 ~ 꼬리 세그먼트 ---------- */
        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const curr = this.segments[i];

            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.hypot(dx, dy);

            if (dist > this.segmentSpacing) {
                const move = dist - this.segmentSpacing;
                const ratio = move / dist;
                curr.x += dx * ratio;
                curr.y += dy * ratio;
            }
        }
    }
}
