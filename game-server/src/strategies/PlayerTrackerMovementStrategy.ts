import { Food, Worm, WormType } from "@beyondworm/shared";
import { MovementStrategy } from "../types/movement";

/**
 * 플레이어 추적 움직임 전략
 */
export class PlayerTrackerMovementStrategy implements MovementStrategy {
    update(worm: Worm, allWorms: Worm[], _foods: Map<string, Food>): { x: number; y: number } | null {
        const head = worm.segments[0];

        // 가장 가까운 플레이어 추적
        let nearestPlayer: Worm | null = null;
        let minDistance = Infinity;

        for (const targetWorm of allWorms) {
            if (targetWorm.type === WormType.Player) {
                const distance = Math.hypot(targetWorm.segments[0].x - head.x, targetWorm.segments[0].y - head.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPlayer = targetWorm;
                }
            }
        }

        if (nearestPlayer) {
            const dx = nearestPlayer.segments[0].x - head.x;
            const dy = nearestPlayer.segments[0].y - head.y;
            const magnitude = Math.hypot(dx, dy);
            if (magnitude > 0) {
                return { x: dx / magnitude, y: dy / magnitude };
            }
        }

        return null;
    }
}
