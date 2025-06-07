import Phaser from "phaser";

export default class WormScene extends Phaser.Scene {
    private segments!: Phaser.GameObjects.Arc[];
    private path: Phaser.Math.Vector2[] = [];

    private readonly headSpeed = 350;     // px/s
    private readonly segmentSpacing = 18; // px
    private readonly segmentCount = 25;

    private lastVel = new Phaser.Math.Vector2(0, 0);
    private prevPointer = new Phaser.Math.Vector2();
    private lastHeadPos = new Phaser.Math.Vector2();

    create() {
        const {width, height} = this.scale;

        /* 1) 지렁이 세그먼트 생성 */
        this.segments = [];
        for (let i = 0; i < this.segmentCount; i++) {
            const seg = this.add.circle(
                width / 2,
                height / 2 + i * this.segmentSpacing,
                10,
                0xaaff66
            );
            this.segments.push(seg);
        }

        /* 2) 초기 경로를 몸통 길이만큼 채워 둡니다 */
        this.lastHeadPos.set(this.segments[0].x, this.segments[0].y);
        for (let i = 0; i < this.segmentSpacing * this.segmentCount; i++) {
            // 머리에서 아래쪽으로 segmentSpacing 간격
            this.path.push(new Phaser.Math.Vector2(
                this.lastHeadPos.x,
                this.lastHeadPos.y + i
            ));
        }

        this.prevPointer.set(
            this.input.activePointer.worldX,
            this.input.activePointer.worldY
        );
    }

    update(_t: number, deltaMs: number) {
        const dt = deltaMs / 1000;
        const pointer = this.input.activePointer;
        const head = this.segments[0];

        /* ---------- 1) 머리 방향 계산 ---------- */
        const movedX = pointer.worldX - this.prevPointer.x;
        const movedY = pointer.worldY - this.prevPointer.y;
        const movedSq = movedX * movedX + movedY * movedY;
        const epsilonSq = 4; // 2 px 이하면 ‘정지’

        const dir = new Phaser.Math.Vector2();

        if (movedSq > epsilonSq) {
            // 머리→포인터 방향
            dir.set(pointer.worldX - head.x, pointer.worldY - head.y).normalize();
            this.lastVel.copy(dir);
        } else {
            // 포인터 정지 → 이전 방향 유지
            dir.copy(this.lastVel);
        }

        /* ---------- 2) 머리 이동 & 경로 샘플링 ---------- */
        head.x += dir.x * this.headSpeed * dt;
        head.y += dir.y * this.headSpeed * dt;

        // 머리가 이동한 거리를 1 px 단위로 샘플링
        const dx = head.x - this.lastHeadPos.x;
        const dy = head.y - this.lastHeadPos.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 0) {
            const steps = Math.floor(dist);
            for (let s = 1; s <= steps; s++) {
                const t = s / dist; // 0~1
                this.path.unshift(new Phaser.Math.Vector2(
                    this.lastHeadPos.x + dx * t,
                    this.lastHeadPos.y + dy * t
                ));
            }
            this.lastHeadPos.set(head.x, head.y);
        }

        /* 오래된 경로 잘라내 메모리 유지 */
        const maxPath = this.segmentSpacing * this.segmentCount + 50;
        if (this.path.length > maxPath) this.path.length = maxPath;

        /* ---------- 3) 몸통을 경로에 ‘재생’ ---------- */
        for (let i = 1; i < this.segments.length; i++) {
            const idx = i * this.segmentSpacing;
            if (idx < this.path.length) {
                const p = this.path[idx];
                this.segments[i].setPosition(p.x, p.y);
            }
        }

        /* ---------- 4) 상태 업데이트 ---------- */
        this.prevPointer.set(pointer.worldX, pointer.worldY);
    }
}
