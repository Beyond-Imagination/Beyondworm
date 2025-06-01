class Client {
    private socket: WebSocket;

    constructor(private serverUrl: string) {}

    connect() {
        this.socket = new WebSocket(this.serverUrl);

        this.socket.onopen = () => {
            console.log('Connected to the server');
        };

        this.socket.onmessage = (event) => {
            this.receiveUpdate(event.data);
        };

        this.socket.onclose = () => {
            console.log('Disconnected from the server');
        };
    }

    sendAction(action: string) {
        this.socket.send(action);
    }

    receiveUpdate(data: string) {
        console.log('Received update from server:', data);
    }
}

export default Client;