import { ExamData, GradeResponse, SHResponse, ExamChunk, ExamWithRequestId, AsyncGradeResponse, RequestStatus } from '../types';
import { SHProtocolService } from './SHProtocolService';
import { SHCommand } from '../types';
import { RequestRepository } from '../repositories/RequestRepository';
import { v4 as uuidv4 } from 'uuid';

export class ExamService {
  private shProtocolService: SHProtocolService;
  private requestRepository: RequestRepository;
  private readonly MAX_CHUNK_SIZE = 100; // Máximo de exámenes por chunk

  constructor(shProtocolService: SHProtocolService) {
    this.shProtocolService = shProtocolService;
    this.requestRepository = new RequestRepository();
  }

  /**
   * Procesa exámenes de forma asíncrona con chunking
   */
  async gradeExamsAsync(host: string, port: number, exams: ExamData[]): Promise<AsyncGradeResponse> {
    console.log(`📝 Procesando ${exams.length} exámenes de forma asíncrona`);
    
    // Generar ID único para la request
    const requestId = uuidv4();
    
    // Dividir exámenes en chunks
    const chunks = this.createChunks(exams, requestId);
    
    // Crear entrada en BD para tracking
    const requestStatus = await this.requestRepository.createRequest({
      total_exams: exams.length,
      processed_exams: 0,
      failed_exams: 0,
      chunks_total: chunks.length,
      chunks_completed: 0,
      status: 'pending'
    });
    
    // Procesar chunks de forma asíncrona (sin esperar)
    this.processChunksAsync(host, port, chunks).catch(error => {
      console.error(`Error procesando chunks para request ${requestId}:`, error);
      // Intentar actualizar request, pero no fallar si no existe
      this.requestRepository.updateRequest(requestId, {
        status: 'failed',
        error_message: error.message
      }).catch(updateError => {
        console.warn(`No se pudo actualizar request ${requestId}:`, updateError.message);
      });
    });
    
    return {
      success: true,
      request_id: requestStatus.id,
      message: `Procesando ${exams.length} exámenes en ${chunks.length} chunks`,
      status: requestStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Procesa exámenes para evaluación (versión síncrona original)
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
   * Crea chunks de exámenes con metadatos
   */
  private createChunks(exams: ExamData[], requestId: string): ExamChunk[] {
    const chunks: ExamChunk[] = [];
    const totalChunks = Math.ceil(exams.length / this.MAX_CHUNK_SIZE);
    
    for (let i = 0; i < exams.length; i += this.MAX_CHUNK_SIZE) {
      const chunkExams = exams.slice(i, i + this.MAX_CHUNK_SIZE);
      const chunkId = uuidv4();
      
      // Agregar metadata a cada examen
      const examsWithMetadata: ExamWithRequestId[] = chunkExams.map(exam => ({
        ...exam,
        request_id: requestId,
        chunk_id: chunkId
      }));
      
      chunks.push({
        chunk_id: chunkId,
        request_id: requestId,
        exams: examsWithMetadata as ExamWithRequestId[],
        chunk_index: Math.floor(i / this.MAX_CHUNK_SIZE),
        total_chunks: totalChunks
      });
    }
    
    return chunks;
  }

  /**
   * Procesa chunks de forma asíncrona
   */
  private async processChunksAsync(host: string, port: number, chunks: ExamChunk[]): Promise<void> {
    console.log(`🔄 Procesando ${chunks.length} chunks...`);
    
    for (const chunk of chunks) {
      try {
        console.log(`📤 Enviando chunk ${chunk.chunk_index + 1}/${chunk.total_chunks} con ${chunk.exams.length} exámenes`);
        
        // Convertir exámenes al formato que espera el cluster
        const clusterExams = this.convertToClusterFormat(chunk.exams);
        const examData = JSON.stringify(clusterExams);
        await this.shProtocolService.sendSHCommand(host, port, SHCommand.REVIEW, examData);
        
        // Actualizar progreso en BD
        try {
          await this.requestRepository.incrementCompletedChunks(chunk.request_id);
          await this.requestRepository.incrementProcessedExams(chunk.request_id, chunk.exams.length);
        } catch (updateError) {
          console.warn(`No se pudo actualizar progreso para request ${chunk.request_id}:`, updateError);
        }
        
        console.log(`✅ Chunk ${chunk.chunk_index + 1} procesado exitosamente`);
        
      } catch (error) {
        console.error(`❌ Error procesando chunk ${chunk.chunk_index + 1}:`, error);
        
        // Marcar exámenes como fallidos
        try {
          await this.requestRepository.incrementFailedExams(chunk.request_id, chunk.exams.length);
          await this.requestRepository.incrementCompletedChunks(chunk.request_id);
        } catch (updateError) {
          console.warn(`No se pudo actualizar errores para request ${chunk.request_id}:`, updateError);
        }
      }
    }
    
    console.log(`🎉 Todos los chunks procesados para request ${chunks[0]?.request_id}`);
  }

  /**
   * Obtiene el estado de una request
   */
  async getRequestStatus(requestId: string): Promise<RequestStatus | null> {
    return await this.requestRepository.getRequestById(requestId);
  }

  /**
   * Convierte exámenes al formato que espera el cluster
   */
  private convertToClusterFormat(exams: ExamWithRequestId[]): any[] {
    console.log('🔄 Converting exams to cluster format:', JSON.stringify(exams, null, 2));
    
    const converted = exams.map((exam, examIndex) => {
      const result = {
        id_exam: exam.exam_id || uuidv4(), // UUID del examen
        process: exam.process_id || "default-process", // Process ID del examen
        area: exam.area_id || "default-area", // Area ID del examen
        request_id: exam.request_id || "unknown-request",
        answers: exam.answers ? exam.answers.map((answer, index) => ({
          qst_idx: index + 1, // Índice de pregunta (1-based)
          ans_idx: this.getAnswerIndex(answer) // Convertir A,B,C,D a 0,1,2,3
        })) : []
      };
      
      console.log(`📝 Exam ${examIndex + 1} converted:`, JSON.stringify(result, null, 2));
      return result;
    });
    
    console.log('✅ Final converted format:', JSON.stringify(converted, null, 2));
    return converted;
  }

  /**
   * Convierte respuesta de letra a índice numérico
   */
  private getAnswerIndex(answer: string): number {
    const answerMap: { [key: string]: number } = {
      'A': 0, 'a': 0,
      'B': 1, 'b': 1, 
      'C': 2, 'c': 2,
      'D': 3, 'd': 3
    };
    return answerMap[answer] ?? 0; // Default a 0 si no reconoce
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