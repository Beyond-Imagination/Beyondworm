/**
 * 각도 차이를 계산하는 유틸리티 함수 (-π ~ π 범위로 정규화)
 */
export function getAngleDifference(current: number, target: number): number {
    let diff = target - current;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
}

/**
 * 방향 벡터를 각도로 변환하는 함수
 */
export function vectorToAngle(x: number, y: number): number {
    return Math.atan2(y, x);
}

/**
 * 각도를 방향 벡터로 변환하는 함수
 */
export function angleToVector(angle: number): { x: number; y: number } {
    return { x: Math.cos(angle), y: Math.sin(angle) };
}
