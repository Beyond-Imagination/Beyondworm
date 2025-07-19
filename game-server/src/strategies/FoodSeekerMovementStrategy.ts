import { MovementStrategy } from "../types/movement";

/**
 * 먹이 탐색 움직임 전략
 */
export class FoodSeekerMovementStrategy implements MovementStrategy {
    update(): { x: number; y: number } | null {
        // 먹이를 찾는 로직 (현재는 랜덤)
        if (Math.random() < 0.05) {
            const x = Math.random() * 2 - 1;
            const y = Math.random() * 2 - 1;
            const magnitude = Math.hypot(x, y);
            if (magnitude > 0) {
                return { x: x / magnitude, y: y / magnitude };
            }
        }
        return null;
    }
}
