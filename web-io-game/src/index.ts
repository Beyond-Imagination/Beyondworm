// filepath: /web-io-game/web-io-game/src/index.ts
import { Server } from './server/server';
import { GameEngine } from './game/gameEngine';

const server = new Server();
const gameEngine = new GameEngine();

server.start();
gameEngine.start();