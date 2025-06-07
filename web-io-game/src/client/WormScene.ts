import Phaser from "phaser";

export default class WormScene extends Phaser.Scene {
    private segments!: Phaser.GameObjects.Arc[];
    private path: Phaser.Math.Vector2[] = [];

    /* ── 조정 파라미터 ───────────────────────────── */
    private readonly headSpeed = 350;   // 머리 직진 속도(px/s)
    private readonly turnLerp = 0.15;  // 0~1, 클수록 민첩
    private readonly segmentSpacing = 18; // 세그먼트 간 거리(px)
    private readonly segmentCount = 25; // 몸통 길이
    /* ───────────────────────────────────────────── */

    private lastVel = new Phaser.Math.Vector2(0, 1); // 진행 단위 벡터
    private prevPtr = new Phaser.Math.Vector2();     // 이전 포인터 좌표
    private lastHead = new Phaser.Math.Vector2();     // 직전 머리 좌표

    create() {
        const {width, height} = this.scale;

        /* 1) 세그먼트(원) 생성 */
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

        /* 2) 경로 배열을 몸통 길이만큼 선-채워 */
        this.lastHead.set(this.segments[0].x, this.segments[0].y);
        for (let i = 0; i < this.segmentSpacing * this.segmentCount; i++) {
            this.path.push(
                new Phaser.Math.Vector2(this.lastHead.x, this.lastHead.y + i)
            );
        }

        /* 3) 포인터 초기 좌표 기억 */
        this.prevPtr.set(
            this.input.activePointer.worldX,
            this.input.activePointer.worldY
        );
    }

    update(_t: number, dms: number) {
        const dt = dms / 1000;
        const ptr = this.input.activePointer;
        const head = this.segments[0];

        /* ── A. 목표 방향 계산 ─────────────────────── */
        const desired = new Phaser.Math.Vector2(
            ptr.worldX - head.x,
            ptr.worldY - head.y
        ).normalize();                     // 머리→포인터 방향

        const movedSq =
            (ptr.worldX - this.prevPtr.x) ** 2 +
            (ptr.worldY - this.prevPtr.y) ** 2;

        if (movedSq > 4) {
            // 포인터가 실제로 움직였다면 → 방향 보간
            this.lastVel.lerp(desired, this.turnLerp).normalize();
        }
        // 포인터 정지 시 lastVel 유지 → 관성

        /* ── B. 머리 이동 & 경로 샘플링 ─────────────── */
        head.x += this.lastVel.x * this.headSpeed * dt;
        head.y += this.lastVel.y * this.headSpeed * dt;

        // 머리에서 마지막 기록 지점까지 1 px 간격으로 경로 push
        let dx = head.x - this.lastHead.x;
        let dy = head.y - this.lastHead.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 0) {
            const steps = Math.floor(dist);
            for (let s = 1; s <= steps; s++) {
                const t = s / dist;
                this.path.unshift(
                    new Phaser.Math.Vector2(
                        this.lastHead.x + dx * t,
                        this.lastHead.y + dy * t
                    )
                );
            }
            this.lastHead.set(head.x, head.y);
        }

        // 오래된 궤적 잘라 메모리 제한
        const maxPathLen = this.segmentSpacing * this.segmentCount + 50;
        if (this.path.length > maxPathLen) this.path.length = maxPathLen;

        /* ── C. 몸통을 경로 위치에 배치 ─────────────── */
        for (let i = 1; i < this.segments.length; i++) {
            const idx = i * this.segmentSpacing;
            if (idx < this.path.length) this.segments[i].setPosition(
                this.path[idx].x,
                this.path[idx].y
            );
        }

        /* ── D. 상태 갱신 ──────────────────────────── */
        this.prevPtr.set(ptr.worldX, ptr.worldY);
    }
}
