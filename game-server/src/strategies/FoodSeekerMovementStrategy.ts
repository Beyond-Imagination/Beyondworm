import { MovementStrategy } from "../types/movement";
import { Worm, Food } from "@beyondworm/shared";

/**
 * 먹이 탐색 움직임 전략
 */
export class FoodSeekerMovementStrategy implements MovementStrategy {
    update(worm: Worm, _allWorms: Worm[], foods: Map<string, Food>): { x: number; y: number } | null {
        const head = worm.segments[0];

        // 가장 가까운 먹이 찾기
        let closestFood: Food | null = null;
        let closestDistance = Infinity;

        for (const food of foods.values()) {
            const distance = Math.hypot(head.x - food.x, head.y - food.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestFood = food;
            }
        }

        // 가까운 먹이가 있으면 그 방향으로 이동
        if (closestFood) {
            const dx = closestFood.x - head.x;
            const dy = closestFood.y - head.y;
            const magnitude = Math.hypot(dx, dy);

            if (magnitude > 0) {
                return { x: dx / magnitude, y: dy / magnitude };
            }
        }

        // 그럴경우는 없겠지만 먹이가 없으면 무작위한 타이밍에 무작위한 방향으로 이동
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
