import GameSettings from "./GameSettings";

export function registerCheats(scene: Phaser.Scene) {
    // 콘솔에서 setFoodCount(count)로 최소 먹이 개수 변경
    (window as any).setFoodCount = (count: number) => {
        GameSettings.instance.set("MINIMUM_FOOD_COUNT", count);
        console.log(`[치트] 최소 먹이 개수 변경: ${count}`);
    };

    // showGameState: GameSettings의 모든 값을 화면에 토글로 표시
    (window as any).showGameState = (() => {
        let visible = false;
        return () => {
            visible = !visible;
            const uiScene = scene.scene.get("UIScene");
            if (uiScene && typeof uiScene.toggleGameStateDebug === "function") {
                uiScene.toggleGameStateDebug(visible);
            }
        };
    })();
}
