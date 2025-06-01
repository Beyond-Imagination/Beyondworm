import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { GameState, Action } from '../types';

export class Server {
    private httpServer: HttpServer;
    private io: SocketServer;
    private gameState: GameState;

    constructor(port: number) {
        this.httpServer = new HttpServer();
        this.io = new SocketServer(this.httpServer);
        this.gameState = this.initializeGameState();
    }

    public start(): void {
        this.httpServer.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    private handleConnection(socket: SocketIO.Socket): void {
        console.log(`Client connected: ${socket.id}`);

        socket.on('action', (action: Action) => {
            this.handleAction(action);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    }

    private handleAction(action: Action): void {
        // Handle player actions and update game state
        // Example: this.gameState = updateGameState(this.gameState, action);
        this.broadcastUpdate();
    }

    private broadcastUpdate(): void {
        this.io.emit('gameState', this.gameState);
    }

    private initializeGameState(): GameState {
        // Initialize the game state
        return {
            // Define initial game state properties
        };
    }
}