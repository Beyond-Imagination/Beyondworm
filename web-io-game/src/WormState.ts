import { GAME_CONSTANTS, WormType } from "@beyondworm/shared";
import { FE_CONSTANTS } from "./constants";

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
    public nicknameText: Phaser.GameObjects.Text | null = null;
    private baseFontSize: number = 25; // 기본 폰트 크기
    private glowSegments: Phaser.GameObjects.Arc[] = [];
    private eyes: Phaser.GameObjects.Arc[] = [];
    private pupils: Phaser.GameObjects.Arc[] = [];

    // 보간 처리를 위한 데이터
    public interpolationData: SegmentInterpolationData[] = [];
    public lastServerUpdateTime: number = 0;

    constructor(segments: Phaser.GameObjects.Arc[], wormType: WormType) {
        this.segments = segments || [];
        this.isSprinting = false;
        this.wormType = wormType;
        this.initializeSegmentVisuals();
        this.initializeInterpolationData();
    }

    private initializeSegmentVisuals() {
        this.clearSegmentVisuals();
        for (let i = 0; i < this.segments.length; i++) {
            this.createSegmentVisual(i);
        }
        this.updateSegmentVisuals();
    }

    private clearSegmentVisuals() {
        this.glowSegments.forEach((segment) => segment.destroy());
        this.eyes.forEach((eye) => eye.destroy());
        this.pupils.forEach((pupil) => pupil.destroy());
        this.glowSegments = [];
        this.eyes = [];
        this.pupils = [];
    }

    private createSegmentVisual(index: number) {
        const segment = this.segments[index];
        const fillColor = segment.fillColor ?? 0x00ff88;
        const glow = segment.scene.add.circle(segment.x, segment.y, segment.radius * 1.35, fillColor, 0.23);
        glow.setDepth(segment.depth - 1);
        this.glowSegments[index] = glow;

        // 코어는 충돌 판정을 유지하는 기존 Arc를 그대로 사용하면서 스타일만 강화
        segment.setStrokeStyle(3, 0x102035, 0.95);

        if (index === 0) {
            const eyeLeft = segment.scene.add.circle(segment.x, segment.y, 4, 0xffffff, 1);
            const eyeRight = segment.scene.add.circle(segment.x, segment.y, 4, 0xffffff, 1);
            const pupilLeft = segment.scene.add.circle(segment.x, segment.y, 2, 0x0b1020, 1);
            const pupilRight = segment.scene.add.circle(segment.x, segment.y, 2, 0x0b1020, 1);

            eyeLeft.setDepth(segment.depth + 2);
            eyeRight.setDepth(segment.depth + 2);
            pupilLeft.setDepth(segment.depth + 3);
            pupilRight.setDepth(segment.depth + 3);

            this.eyes = [eyeLeft, eyeRight];
            this.pupils = [pupilLeft, pupilRight];
        }
    }

    private updateSegmentVisuals() {
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const glow = this.glowSegments[i];
            if (!glow) continue;

            const tailFactor = 1 - i / Math.max(this.segments.length, 1);
            const stripeAlpha = i % 4 < 2 ? 1 : 0.78;

            glow.setPosition(segment.x, segment.y);
            glow.setRadius(segment.radius * (1.45 - 0.18 * (1 - tailFactor)));
            glow.setFillStyle(segment.fillColor ?? 0x00ff88, 0.16 + tailFactor * 0.16);

            segment.setFillStyle(segment.fillColor ?? 0x00ff88, stripeAlpha);
        }

        this.updateHeadEyes();
    }

    private updateHeadEyes() {
        if (this.segments.length === 0 || this.eyes.length !== 2 || this.pupils.length !== 2) {
            return;
        }

        const head = this.segments[0];
        const neck = this.segments[1] ?? this.segments[0];
        const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
        const eyeRadius = Math.max(2.8, head.radius * 0.27);
        const pupilRadius = Math.max(1.4, eyeRadius * 0.5);
        const eyeDistance = head.radius * 0.54;
        const pupilForward = pupilRadius * 0.35;

        const eyeOffsetLeft = {
            x: Math.cos(angle + 0.5) * eyeDistance,
            y: Math.sin(angle + 0.5) * eyeDistance,
        };
        const eyeOffsetRight = {
            x: Math.cos(angle - 0.5) * eyeDistance,
            y: Math.sin(angle - 0.5) * eyeDistance,
        };
        const pupilOffset = {
            x: Math.cos(angle) * pupilForward,
            y: Math.sin(angle) * pupilForward,
        };

        this.eyes[0].setPosition(head.x + eyeOffsetLeft.x, head.y + eyeOffsetLeft.y).setRadius(eyeRadius);
        this.eyes[1].setPosition(head.x + eyeOffsetRight.x, head.y + eyeOffsetRight.y).setRadius(eyeRadius);

        this.pupils[0]
            .setPosition(head.x + eyeOffsetLeft.x + pupilOffset.x, head.y + eyeOffsetLeft.y + pupilOffset.y)
            .setRadius(pupilRadius);
        this.pupils[1]
            .setPosition(head.x + eyeOffsetRight.x + pupilOffset.x, head.y + eyeOffsetRight.y + pupilOffset.y)
            .setRadius(pupilRadius);
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
                const distance = Math.hypot(
                    data.targetPosition.x - data.previousPosition.x,
                    data.targetPosition.y - data.previousPosition.y,
                );

                // 거리가 클 때는 더 빠르게 보간하여 끊김 현상 방지
                let adjustedFactor = interpolationFactor;
                const CATCH_UP_DISTANCE_THRESHOLD = 50;
                if (distance > CATCH_UP_DISTANCE_THRESHOLD) {
                    // 50px 이상 차이나면 빠르게 따라잡기
                    adjustedFactor = Math.min(interpolationFactor * 1.5, 1);
                }

                // 부드러운 위치 보간
                const newX = this.lerp(data.previousPosition.x, data.targetPosition.x, adjustedFactor);
                const newY = this.lerp(data.previousPosition.y, data.targetPosition.y, adjustedFactor);
                const newRadius = this.lerp(data.previousRadius, data.targetRadius, interpolationFactor);

                segment.x = newX;
                segment.y = newY;
                segment.setRadius(newRadius);

                // Physics body도 업데이트
                if (segment.body) {
                    (segment.body as Phaser.Physics.Arcade.Body).setCircle(newRadius);
                }
            }
        }
        this.updateSegmentVisuals();
    }

    /**
     * 부드러운 선형 보간 함수
     */
    private lerp(start: number, end: number, factor: number): number {
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
        this.createSegmentVisual(this.segments.length - 1);
        this.updateSegmentVisuals();
    }

    /**
     * 세그먼트 제거 시 보간 데이터도 함께 제거
     */
    public removeLastSegment(): Phaser.GameObjects.Arc | undefined {
        this.interpolationData.pop();
        const removedGlow = this.glowSegments.pop();
        removedGlow?.destroy();

        const removedSegment = this.segments.pop();
        if (this.segments.length === 0) {
            this.clearSegmentVisuals();
        }
        this.updateSegmentVisuals();
        return removedSegment;
    }

    /**
     * 닉네임 텍스트를 설정합니다.
     */
    public setNicknameText(text: Phaser.GameObjects.Text) {
        this.nicknameText = text;
    }

    /**
     * 닉네임 위치를 지렁이 머리 위로 업데이트합니다.
     */
    public updateNicknamePosition(cameraZoom: number) {
        if (this.nicknameText && this.segments.length > 0) {
            const head = this.segments[0];
            this.nicknameText.setPosition(head.x, head.y - head.radius - FE_CONSTANTS.NICKNAME_Y_OFFSET);

            // 줌이 작아질수록 텍스트를 크게 만들어서 가독성 유지
            const scaleFactor = 1 / cameraZoom;
            const adjustedFontSize = this.baseFontSize * scaleFactor;

            // 최소 폰트 크기 제한
            const minFontSize = 10;
            const clampedFontSize = Math.max(minFontSize, adjustedFontSize);

            this.nicknameText.setFontSize(clampedFontSize);
        }
    }

    /**
     * 닉네임 텍스트를 제거합니다.
     */
    public destroyNicknameText() {
        if (this.nicknameText) {
            this.nicknameText.destroy();
            this.nicknameText = null;
        }
        this.clearSegmentVisuals();
    }
}
