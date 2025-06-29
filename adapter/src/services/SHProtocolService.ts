import { SHCommand, COMMAND_NAMES, SHResponse } from '../types';
import { TCPPool } from '../system/pool';

export class SHProtocolService {
  private tcpPool: TCPPool;
  private timeout: number;

  constructor(timeout: number = 60000) {
    this.tcpPool = new TCPPool();
    this.timeout = timeout;
  }

  /**
   * Construye un mensaje del protocolo SH
   * Formato: "SH <command> <length> <data>$"
   */
  buildSHMessage(command: SHCommand, data: string = ''): string {
    const dataStr = String(data);
    const length = Buffer.byteLength(dataStr, 'utf8');
    return `SH ${command} ${length} ${dataStr}$`;
  }

  /**
   * Parsea una respuesta del protocolo SH
   */
  parseSHResponse(response: string): SHResponse {
    const trimmed = response.trim();
    
    // Verificar si es una respuesta del protocolo SH
    if (trimmed.startsWith('SH ') && trimmed.endsWith('$')) {
      const parts = trimmed.slice(3, -1).split(' ');
      if (parts.length >= 2) {
        const command = parseInt(parts[0]);
        const length = parseInt(parts[1]);
        const data = parts.slice(2).join(' ');
        
        return {
          protocol: 'SH',
          command: command,
          command_name: COMMAND_NAMES[command] || 'UNKNOWN',
          length: length,
          data: data,
          raw: trimmed
        };
      }
    }
    
    // Si no es protocolo SH, devolver como texto plano
    return {
      protocol: 'RAW',
      data: trimmed,
      raw: trimmed
    };
  }

  /**
   * Envía un comando SH al servidor TCP
   */
  async sendSHCommand(host: string, port: number, command: SHCommand, data: string = ''): Promise<SHResponse> {
    console.log(`Enviando comando SH ${COMMAND_NAMES[command]} a ${host}:${port}`);
    
    return new Promise(async (resolve, reject) => {
      let socket: any;
      let timeoutId: NodeJS.Timeout | undefined;
      let responseBuffer = '';

      try {
        // Configurar timeout
        timeoutId = setTimeout(() => {
          console.log(`Timeout alcanzado (${this.timeout}ms) para ${host}:${port}`);
          if (socket && !socket.destroyed) {
            socket.destroy();
          }
          reject(new Error(`Timeout después de ${this.timeout}ms`));
        }, this.timeout);

        // Obtener conexión TCP
        socket = await this.tcpPool.getConnection(host, port);
        console.log(`Conexión TCP establecida a ${host}:${port}`);

        // Configurar manejo de respuesta
        const onData = (chunk: Buffer) => {
          responseBuffer += chunk.toString('utf8');
          
          // Verificar si tenemos una respuesta completa (termina en $)
          if (responseBuffer.includes('$')) {
            const messages = responseBuffer.split('$');
            const completeMessage = messages[0] + '$';
            
            console.log(`Respuesta SH recibida: ${completeMessage}`);
            
            clearTimeout(timeoutId);
            socket.removeListener('data', onData);
            socket.removeListener('error', onError);
            
            const parsed = this.parseSHResponse(completeMessage);
            resolve(parsed);
          }
        };

        const onError = (error: Error) => {
          console.error(`Error en socket TCP: ${error.message}`);
          clearTimeout(timeoutId);
          socket.removeListener('data', onData);
          reject(error);
        };

        socket.on('data', onData);
        socket.on('error', onError);

        // Construir y enviar comando SH
        const message = this.buildSHMessage(command, data);
        console.log(`Enviando mensaje SH: ${message}`);
        
        socket.write(message, 'utf8');

      } catch (error) {
        console.error(`Error enviando comando SH: ${(error as Error).message}`);
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Cierra todas las conexiones TCP
   */
  closeAllConnections(): void {
    this.tcpPool.closeAll();
  }
}