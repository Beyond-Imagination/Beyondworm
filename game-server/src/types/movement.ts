import { Food, Worm } from "@beyondworm/shared";

/**
 * 움직임 전략 인터페이스
 */
export interface MovementStrategy {
    update(worm: Worm, allWorms: Worm[], foods: Map<string, Food>): { x: number; y: number } | null;
}
