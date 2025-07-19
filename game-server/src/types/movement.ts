import { Worm } from "@beyondworm/shared";

/**
 * 움직임 전략 인터페이스
 */
export interface MovementStrategy {
    update(worm: Worm, allWorms: Worm[]): { x: number; y: number } | null;
}
