import { ExamData, GradeResponse, SHResponse } from '../types';
import { SHProtocolService } from './SHProtocolService';
import { SHCommand } from '../types';

export class ExamService {
  private shProtocolService: SHProtocolService;

  constructor(shProtocolService: SHProtocolService) {
    this.shProtocolService = shProtocolService;
  }

  /**
   * Procesa exámenes para evaluación
   */
  async gradeExams(host: string, port: number, exams: ExamData[]): Promise<GradeResponse> {
    console.log(`📝 Evaluando ${exams.length} exámenes en ${host}:${port}`);
    
    const examData = JSON.stringify(exams);
    const response = await this.shProtocolService.sendSHCommand(host, port, SHCommand.REVIEW, examData);
    
    // Parsear resultados
    let results = response.data;
    try {
      if (typeof response.data === 'string') {
        results = JSON.parse(response.data);
      }
    } catch (e) {
      console.warn('⚠️ Respuesta no es JSON, devolviendo como texto');
    }
    
    return {
      success: true,
      exams_count: exams.length,
      results: results,
      processing_time: new Date().toISOString(),
      server_response: response.command_name === 'UNKNOWN' ? 'SUCCESS' : response.command_name || 'SUCCESS'
    };
  }

  /**
   * Obtiene las claves de respuesta del servidor
   */
  async getAnswers(host: string, port: number): Promise<SHResponse> {
    return await this.shProtocolService.sendSHCommand(host, port, SHCommand.GET_ANSWERS);
  }

  /**
   * Establece las claves de respuesta en el servidor
   */
  async setAnswers(host: string, port: number, answers: string | object): Promise<SHResponse> {
    const data = typeof answers === 'string' ? answers : JSON.stringify(answers);
    return await this.shProtocolService.sendSHCommand(host, port, SHCommand.SET_ANSWERS, data);
  }

  /**
   * Envía un comando ECHO para probar conectividad
   */
  async echo(host: string, port: number, message: string = 'ping'): Promise<SHResponse> {
    return await this.shProtocolService.sendSHCommand(host, port, SHCommand.ECHO, message);
  }

  /**
   * Envía comando de shutdown al servidor
   */
  async shutdown(host: string, port: number): Promise<SHResponse> {
    return await this.shProtocolService.sendSHCommand(host, port, SHCommand.SHUTDOWN);
  }

  /**
   * Envía un comando personalizado
   */
  async sendCustomCommand(host: string, port: number, command: SHCommand, data?: string): Promise<SHResponse> {
    return await this.shProtocolService.sendSHCommand(host, port, command, data);
  }
}