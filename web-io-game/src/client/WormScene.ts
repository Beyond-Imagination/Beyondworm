// src/client/WormScene.ts
import Phaser from "phaser";

export default class WormScene extends Phaser.Scene {
    private segments!: Phaser.GameObjects.Arc[];

    /** 머리가 마우스를 쫓는 속도(px/s) */
    private readonly headSpeed = 350;
    /** 세그먼트 간 고정 거리(px) */
    private readonly segmentSpacing = 18;
    /** 세그먼트(원) 개수 */
    private readonly segmentCount = 25;

    create() {
        const {width, height} = this.scale;

        // ① 지렁이 몸통(원)들 만들기
        this.segments = [];
        for (let i = 0; i < this.segmentCount; i++) {
            const c = this.add.circle(
                width / 2,
                height / 2 + i * this.segmentSpacing,
                10,
                0xaaff66
            );
            this.segments.push(c);
        }

        // ② 창 크기 바뀌면, 몸통을 화면 중앙 기준으로 다시 정렬(선택)
        this.scale.on("resize", ({width, height}: Phaser.Structs.Size) => {
            const dx = width / 2 - this.segments[0].x;
            const dy = height / 2 - this.segments[0].y;
            this.segments.forEach(s => {
                s.x += dx;
                s.y += dy;
            });
        });
    }

    update(_: number, delta: number) {
        /** ---------- 1) 머리(0번 세그먼트)가 마우스를 추적 ---------- */
        const head = this.segments[0];
        const p = this.input.activePointer;

        const dxHead = p.worldX - head.x;
        const dyHead = p.worldY - head.y;
        const distHead = Math.hypot(dxHead, dyHead);

        if (distHead > 1) {
            const maxMove = (this.headSpeed * delta) / 1000;
            const t = Math.min(1, maxMove / distHead); // 한 프레임 이동 한계
            head.x += dxHead * t;
            head.y += dyHead * t;
        }

        /** ---------- 2) 나머지 세그먼트가 ‘앞 세그먼트’를 따라감 ---------- */
        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const curr = this.segments[i];

            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.hypot(dx, dy);

            // 앞놈과 일정 간격보다 멀어지면 그 거리만큼 당겨옴
            if (dist > this.segmentSpacing) {
                const move = dist - this.segmentSpacing;      // 초과 거리
                const ratio = move / dist;                    // 이동 비율
                curr.x += dx * ratio;
                curr.y += dy * ratio;
            }
        }
    }
}
