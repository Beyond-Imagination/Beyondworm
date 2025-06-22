import GameScene from "./GameScene";
import { WormState } from "./WormState";
import Food from "./Food";

export interface MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene, targetObject?: Phaser.GameObjects.Arc): Phaser.Math.Vector2;
}

// 플레이어 움직임 전략
export class PlayerMovementStrategy implements MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene): Phaser.Math.Vector2 {
        const ptr = scene.input.activePointer;
        const worldPoint = scene.cameras.main.getWorldPoint(ptr.x, ptr.y);

        // nextTarget을 마우스 포인터 위치로 설정
        if (!wormState.nextTarget) {
            wormState.nextTarget = new Phaser.GameObjects.Arc(scene, worldPoint.x, worldPoint.y);
        }else {
            wormState.nextTarget.x = worldPoint.x;
            wormState.nextTarget.y = worldPoint.y;
        }
        return wormState.calculateDesiredDirection();
    }
}

// 플레이어 추적 봇 움직임 전략
export class TrackPlayerMovementStrategy implements MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene): Phaser.Math.Vector2 {
        if (!wormState.nextTarget) {
            // gamescene에서 playerstate를 가져와서 head 위치를 nextTarget으로 설정
            if (scene.playerState && Array.isArray(scene.playerState.segments) && scene.playerState.segments.length > 0) {
                wormState.nextTarget = scene.playerState.segments[0];
            }

            if (!wormState.nextTarget){
                return Phaser.Math.Vector2.ZERO; // 플레이어가 없으면 움직이지 않음
            }
        }
        
        return wormState.calculateDesiredDirection();
    }
}

// 먹이 탐색 봇 움직임 전략
export class SeekFoodMovementStrategy implements MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene): Phaser.Math.Vector2 {
        const head = wormState.segments[0];
        if (!head) return Phaser.Math.Vector2.ZERO;

        let closestFood: Food | null = null;
        let minDistanceSq = Infinity;
        const activeFoods = scene.foods.filter((f: Food) => f.sprite.active); // GameScene의 foods에 접근

        if (activeFoods.length > 0) {
            for (const food of activeFoods) {
                const distSq = Phaser.Math.Distance.Squared(head.x, head.y, food.sprite.x, food.sprite.y);
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestFood = food;
                }
            }
        }

        if (closestFood) {
            wormState.nextTarget = closestFood.sprite; // nextTarget에 가장 가까운 음식 스프라이트 저장
            return wormState.calculateDesiredDirection();
        } else {
            // 먹이가 없으면 마지막 방향 유지 시도
            return wormState.lastVel.length() > 0 ? wormState.lastVel.clone().normalize() : new Phaser.Math.Vector2(0, 1);
        }
    }
}
