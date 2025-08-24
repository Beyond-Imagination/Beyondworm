import { GAME_CONSTANTS, WormType } from "@beyondworm/shared";

// 세그먼트의 보간 데이터
interface SegmentInterpolationData {
    previousPosition: { x: number; y: number };
    targetPosition: { x: number; y: number };
    previousRadius: number;
    targetRadius: number;
}

export class WormState {
    public segments: Phaser.GameObjects.Arc[];
    public isSprinting: boolean;
    public wormType: WormType;

    // 보간 처리를 위한 데이터
    public interpolationData: SegmentInterpolationData[] = [];
    public lastServerUpdateTime: number = 0;

    constructor(segments: Phaser.GameObjects.Arc[], wormType: WormType) {
        this.segments = segments || [];
        this.isSprinting = false;
        this.wormType = wormType;
        this.initializeInterpolationData();
    }

    /**
     * 보간 데이터 초기화
     */
    private initializeInterpolationData() {
        this.interpolationData = this.segments.map((segment) => ({
            previousPosition: { x: segment.x, y: segment.y },
            targetPosition: { x: segment.x, y: segment.y },
            previousRadius: segment.radius,
            targetRadius: segment.radius,
        }));
    }

    /**
     * 서버로부터 받은 새 위치로 타겟 업데이트
     */
    public updateTargetPositions(serverSegments: { x: number; y: number }[], radius: number) {
        this.lastServerUpdateTime = Date.now();

        // 세그먼트 수가 변경된 경우 보간 데이터 재초기화
        if (this.interpolationData.length !== this.segments.length) {
            this.initializeInterpolationData();
        }

        for (let i = 0; i < this.segments.length && i < serverSegments.length; i++) {
            const interpolationData = this.interpolationData[i];
            const segment = this.segments[i];

            // 이전 위치를 현재 위치로 설정
            interpolationData.previousPosition = { x: segment.x, y: segment.y };
            interpolationData.previousRadius = segment.radius;

            // 새 타겟 위치 설정
            interpolationData.targetPosition = { x: serverSegments[i].x, y: serverSegments[i].y };
            interpolationData.targetRadius = radius;
        }
    }

    /**
     * 보간을 사용하여 세그먼트 위치 업데이트
     */
    public interpolatePositions() {
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastServerUpdateTime;
        let interpolationFactor = Math.min(timeSinceLastUpdate / GAME_CONSTANTS.TICK_MS, 1);

        // 부드러운 easing 적용 (EaseOutQuad)
        interpolationFactor = 1 - (1 - interpolationFactor) * (1 - interpolationFactor);

        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const data = this.interpolationData[i];

            if (data) {
                // 거리 기반 보간 속도 조정 (거리가 클수록 빠르게 따라잡기)
                const distance = Math.sqrt(
                    Math.pow(data.targetPosition.x - data.previousPosition.x, 2) +
                        Math.pow(data.targetPosition.y - data.previousPosition.y, 2),
                );

                // 거리가 클 때는 더 빠르게 보간하여 끊김 현상 방지
                let adjustedFactor = interpolationFactor;
                if (distance > 50) {
                    // 50px 이상 차이나면 빠르게 따라잡기
                    adjustedFactor = Math.min(interpolationFactor * 1.5, 1);
                }

                // 부드러운 위치 보간
                const newX = this.smoothLerp(data.previousPosition.x, data.targetPosition.x, adjustedFactor);
                const newY = this.smoothLerp(data.previousPosition.y, data.targetPosition.y, adjustedFactor);
                const newRadius = this.smoothLerp(data.previousRadius, data.targetRadius, interpolationFactor);

                segment.x = newX;
                segment.y = newY;
                segment.setRadius(newRadius);

                // Physics body도 업데이트
                if (segment.body) {
                    (segment.body as Phaser.Physics.Arcade.Body).setCircle(newRadius);
                }
            }
        }
    }

    /**
     * 부드러운 선형 보간 함수
     */
    private smoothLerp(start: number, end: number, factor: number): number {
        return start + (end - start) * factor;
    }

    /**
     * 세그먼트 추가 시 보간 데이터도 함께 추가
     */
    public addSegment(segment: Phaser.GameObjects.Arc) {
        this.segments.push(segment);
        this.interpolationData.push({
            previousPosition: { x: segment.x, y: segment.y },
            targetPosition: { x: segment.x, y: segment.y },
            previousRadius: segment.radius,
            targetRadius: segment.radius,
        });
    }

    /**
     * 세그먼트 제거 시 보간 데이터도 함께 제거
     */
    public removeLastSegment(): Phaser.GameObjects.Arc | undefined {
        this.interpolationData.pop();
        return this.segments.pop();
    }
}
