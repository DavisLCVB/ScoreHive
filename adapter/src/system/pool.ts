import { createConnection, Socket } from "net";

export class TCPPool {
  private connections: Map<string, Socket>;

  constructor() {
    this.connections = new Map();
  }

  async getConnection(host: string, port: number): Promise<Socket> {
    const key = `${host}:${port}`;
    
    if (this.connections.has(key)) {
      const conn = this.connections.get(key);
      if (conn && !conn.destroyed) {
        return conn;
      }
      this.connections.delete(key);
    }

    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port }, () => {
        this.connections.set(key, socket);
        resolve(socket);
      });
      
      socket.on('error', reject);
      socket.on('close', () => {
        this.connections.delete(key);
      });
    });
  }

  closeAll(): void {
    for (const [, socket] of this.connections) {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }
    this.connections.clear();
  }

  get size(): number {
    return this.connections.size;
  }
}
