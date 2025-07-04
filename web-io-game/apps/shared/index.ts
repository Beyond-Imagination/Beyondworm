export interface Player {
    id: string;
    name: string;
    score: number;
}

export interface GameState {
    players: Player[];
    currentTurn: string;
    gameOver: boolean;
}

export interface Action {
    type: string;
    payload: any;
}
