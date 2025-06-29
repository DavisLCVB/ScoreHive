import { TCPPool } from "./pool";
import { Socket } from "net";

enum SHCommand {
  GET_ANSWERS = 0,
  SET_ANSWERS = 1,
  REVIEW = 2,
  ECHO = 3,
  SHUTDOWN = 4,
}

interface SHMessage {
  protocol: string;
  command: SHCommand;
  length: number;
  data: string;
}

class Parser {
  static build = (command: SHCommand, data: string): string => {
    const dataStr = String(data);
    const length = Buffer.byteLength(dataStr, "utf8");
    return `SH ${command} ${length} ${dataStr}$`;
  };

  static parse = (data: string): SHMessage => {
    const trimmed = data.trim();
    if (trimmed.startsWith("SH ") && trimmed.endsWith("$")) {
      const parts = trimmed.slice(3, -1).split(" ");
      if (parts.length < 2) {
        throw new Error("Invalid SH message");
      }
      const command = parseInt(parts[0]);
      const length = parseInt(parts[1]);
      const data = parts.slice(2).join(" ");
      return {
        protocol: "SH",
        command: this.parseCommand(command),
        length: length,
        data: data,
      };
    }
    throw new Error("Invalid SH message");
  };

  private static parseCommand = (command: number): SHCommand => {
    switch (command) {
      case 0:
        return SHCommand.GET_ANSWERS;
      case 1:
        return SHCommand.SET_ANSWERS;
      case 2:
        return SHCommand.REVIEW;
      case 3:
        return SHCommand.ECHO;
      case 4:
        return SHCommand.SHUTDOWN;
      default:
        return SHCommand.ECHO;
    }
  };
}

class ClusterCommunicator {
  private static timeout = 5000;

  static send = async (
    host: string,
    port: number,
    command: SHCommand,
    data = ""
  ): Promise<SHMessage> => {
    console.log(`Sending command ${command} to ${host}:${port}`);

    try {
      // Obtener conexión TCP
      const pool = new TCPPool();
      const socket = await pool.getConnection(host, port);
      console.log(`Conexión TCP establecida a ${host}:${port}`);

      // Construir y enviar comando SH
      const message = Parser.build(command, data);
      console.log(`Enviando mensaje SH: ${message}`);
      socket.write(message, "utf8");

      // Esperar respuesta con timeout
      const response = await this.waitForSHResponse(socket);
      console.log(`Respuesta SH recibida: ${response}`);

      return Parser.parse(response);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error sending command: ${error.message}`);
      } else {
        console.error(`Error sending command: ${error}`);
      }
      throw error;
    }
  };

  private static waitForSHResponse(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      let responseBuffer = "";
      let timeoutId;

      // Configurar timeout
      timeoutId = setTimeout(() => {
        console.log(`Timeout alcanzado (${this.timeout}ms)`);
        cleanup();
        if (socket && !socket.destroyed) {
          socket.destroy();
        }
        reject(new Error(`Timeout después de ${this.timeout}ms`));
      }, this.timeout);

      const onData = (chunk: Buffer) => {
        responseBuffer += chunk.toString("utf8");

        // Verificar si tenemos una respuesta completa (termina en $)
        if (responseBuffer.includes("$")) {
          const messages = responseBuffer.split("$");
          const completeMessage = messages[0] + "$";

          cleanup();
          resolve(completeMessage);
        }
      };

      const onError = (error: Error) => {
        console.error(`Error en socket TCP: ${error.message}`);
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
      };

      socket.on("data", onData);
      socket.on("error", onError);
    });
  }
}

export { Parser, ClusterCommunicator, SHCommand, SHMessage };
