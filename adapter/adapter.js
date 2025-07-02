const express = require('express');
const cors = require('cors');
const net = require('net');
const { promisify } = require('util');

// Enum de comandos del protocolo SH
const SH_COMMANDS = {
  GET_ANSWERS: 0,
  SET_ANSWERS: 1,
  REVIEW: 2,
  ECHO: 3,
  SHUTDOWN: 4
};

// Mapeo inverso para logging
const COMMAND_NAMES = Object.fromEntries(
  Object.entries(SH_COMMANDS).map(([key, value]) => [value, key])
);

class TCPConnectionPool {
  constructor() {
    this.connections = new Map();
  }

  async getConnection(host, port) {
    const key = `${host}:${port}`;
    
    if (this.connections.has(key)) {
      const conn = this.connections.get(key);
      if (!conn.destroyed) {
        return conn;
      }
      this.connections.delete(key);
    }

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () => {
        this.connections.set(key, socket);
        resolve(socket);
      });
      
      socket.on('error', reject);
      socket.on('close', () => {
        this.connections.delete(key);
      });
    });
  }

  closeAll() {
    for (const [key, socket] of this.connections) {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }
    this.connections.clear();
  }
}

class SHProtocolAdapter {
  constructor(options = {}) {
    this.app = express();
    this.app.use(cors());
    this.tcpPool = new TCPConnectionPool();
    this.timeout = options.timeout || 10000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Convierte respuesta del cluster al formato esperado por el frontend
   * Cluster: [{ stage: 1, answers: [{ qst_idx: 1, rans_idx: 1 }] }]
   * Frontend: { "EXAM_001": ["A", "B", "C", "D"] }
   */
  convertClusterAnswersToFrontendFormat(clusterData) {
    const answerKeys = {};
    
    if (!Array.isArray(clusterData)) {
      console.warn('Datos del cluster no son un array:', clusterData);
      return answerKeys;
    }
    
    clusterData.forEach((examAnswers) => {
      if (!examAnswers.stage || !Array.isArray(examAnswers.answers)) {
        console.warn('Formato de examen inválido:', examAnswers);
        return;
      }
      
      // Generar exam_id basado en el stage
      const examId = `EXAM_STAGE_${examAnswers.stage.toString().padStart(3, '0')}`;
      
      // Convertir respuestas de números a letras (1=A, 2=B, 3=C, 4=D, etc.)
      const answers = examAnswers.answers
        .sort((a, b) => a.qst_idx - b.qst_idx) // Ordenar por índice de pregunta
        .map((answer) => {
          // Convertir índice de respuesta a letra (1=A, 2=B, etc.)
          if (answer.rans_idx >= 1 && answer.rans_idx <= 26) {
            return String.fromCharCode('A'.charCodeAt(0) + answer.rans_idx - 1);
          }
          return 'A'; // Por defecto A si el índice está fuera de rango
        });
      
      answerKeys[examId] = answers;
    });
    
    return answerKeys;
  }

  /**
   * Convierte claves de respuesta del formato del adapter al formato del cluster
   * Adapter: { "E001": ["A", "B", "C", "D"], "E002": ["B", "A", "D", "C"] }
   * Cluster: [{ stage: 1, answers: [{ qst_idx: 1, rans_idx: 1 }] }]
   */
  convertAnswerKeysToClusterFormat(answerKeys) {
    // El cluster solo puede almacenar UNA ficha de respuestas a la vez
    // Tomamos la primera clave de respuesta disponible
    const examIds = Object.keys(answerKeys);
    if (examIds.length === 0) {
      throw new Error('No se proporcionaron claves de respuesta');
    }
    
    // Usar solo la primera clave de respuesta
    const firstExamId = examIds[0];
    const answers = answerKeys[firstExamId];
    
    if (examIds.length > 1) {
      console.warn(`⚠️ El cluster solo puede almacenar una ficha a la vez. Usando: ${firstExamId}, ignorando ${examIds.length - 1} adicionales`);
    }
    
    // Convertir respuestas de letras a índices
    const convertedAnswers = answers.map((answer, questionIndex) => {
      const upperAnswer = answer.toUpperCase().trim();
      let answerIndex;
      
      if (upperAnswer >= 'A' && upperAnswer <= 'Z') {
        answerIndex = upperAnswer.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
      } else {
        const numAnswer = parseInt(upperAnswer);
        answerIndex = isNaN(numAnswer) ? 1 : numAnswer;
      }
      
      return {
        qst_idx: questionIndex + 1,  // Índice de pregunta (1-based)
        rans_idx: answerIndex        // Índice de respuesta correcta (A=1, B=2, etc.)
      };
    });
    
    // Retornar array con UN solo elemento (stage 1)
    return [{
      stage: 1,
      answers: convertedAnswers
    }];
  }

  /**
   * Convierte el formato del frontend al formato esperado por el cluster
   * Frontend: { student_id, exam_id, answers: ["A", "B", "C", "D"] }
   * Cluster: { stage, id_exam, answers: [{ qst_idx, ans_idx }] }
   */
  convertToClusterFormat(frontendExams) {
    if (!Array.isArray(frontendExams)) {
      throw new Error('Los exámenes deben ser un array');
    }

    return frontendExams.map((exam, examIndex) => {
      // Validar estructura del examen
      if (!exam.student_id || !exam.exam_id || !Array.isArray(exam.answers)) {
        throw new Error(`Examen ${examIndex + 1}: Faltan campos requeridos (student_id, exam_id, answers)`);
      }

      // Convertir exam_id string a número entero
      let numericExamId;
      if (typeof exam.exam_id === 'string') {
        // Extraer número del string (ej: "EXAM_MAT_001" -> 1001)
        const match = exam.exam_id.match(/(\d+)/);
        numericExamId = match ? parseInt(match[0]) : 1000 + examIndex;
      } else {
        numericExamId = parseInt(exam.exam_id) || 1000 + examIndex;
      }

      // Convertir respuestas de strings a formato MPI
      const convertedAnswers = exam.answers.map((answer, questionIndex) => {
        if (typeof answer !== 'string') {
          throw new Error(`Examen ${examIndex + 1}, Pregunta ${questionIndex + 1}: La respuesta debe ser un string`);
        }

        // Convertir letra a índice (A=1, B=2, C=3, D=4, etc.)
        const upperAnswer = answer.toUpperCase().trim();
        let answerIndex;
        
        if (upperAnswer >= 'A' && upperAnswer <= 'Z') {
          answerIndex = upperAnswer.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        } else {
          // Si no es una letra, intentar convertir como número
          const numAnswer = parseInt(upperAnswer);
          answerIndex = isNaN(numAnswer) ? 1 : numAnswer;
        }

        return {
          qst_idx: questionIndex + 1,  // Índice de pregunta (1-based)
          ans_idx: answerIndex         // Índice de respuesta (A=1, B=2, etc.)
        };
      });

      // Validar que no haya valores null o undefined
      if (!numericExamId || numericExamId === null || numericExamId === undefined) {
        throw new Error(`Examen ${examIndex + 1}: ID de examen inválido: ${numericExamId}`);
      }

      // Estructura final para el cluster (sin metadatos que puedan causar confusión)
      return {
        stage: 1,                    // Stage por defecto
        id_exam: numericExamId,      // ID numérico del examen
        answers: convertedAnswers    // Array de objetos { qst_idx, ans_idx }
      };
    });
  }

  /**
   * Convierte resultados MPI al formato esperado por el frontend
   * MPI: [{ stage, id_exam, correct_answers, wrong_answers, unscored_answers, score }]
   * Frontend: [{ student_id, score, correct_answers, wrong_answers, unscored_answers, total_questions, percentage }]
   */
  convertMPIResultsToFrontendFormat(mpiResults, originalExams) {
    if (!Array.isArray(mpiResults) || !Array.isArray(originalExams)) {
      console.warn('Resultados MPI o exámenes originales no son arrays válidos');
      return [];
    }

    // Crear un mapa de id_exam a información del examen original
    // Usar la misma lógica que en convertToClusterFormat
    const examMap = new Map();
    originalExams.forEach((exam, examIndex) => {
      let numericExamId;
      if (typeof exam.exam_id === 'string') {
        // Extraer número del string (ej: "EXAM_MAT_001" -> 1)
        const match = exam.exam_id.match(/(\d+)/);
        numericExamId = match ? parseInt(match[0]) : 1000 + examIndex;
      } else {
        numericExamId = parseInt(exam.exam_id) || 1000 + examIndex;
      }
      
      examMap.set(numericExamId, {
        student_id: exam.student_id,
        exam_id: exam.exam_id,
        total_questions: exam.answers.length
      });
    });

    // Convertir cada resultado MPI al formato del frontend
    return mpiResults.map((mpiResult, index) => {
      const examInfo = examMap.get(mpiResult.id_exam) || {
        student_id: `EST${(index + 1).toString().padStart(3, '0')}`,
        exam_id: `EXAM_${mpiResult.id_exam}`,
        total_questions: mpiResult.correct_answers + mpiResult.wrong_answers + mpiResult.unscored_answers
      };

      const totalQuestions = examInfo.total_questions || 
        (mpiResult.correct_answers + mpiResult.wrong_answers + mpiResult.unscored_answers);
      
      const percentage = totalQuestions > 0 ? 
        (mpiResult.correct_answers / totalQuestions) * 100 : 0;

      return {
        student_id: examInfo.student_id,
        score: mpiResult.score,
        correct_answers: mpiResult.correct_answers,
        wrong_answers: mpiResult.wrong_answers,
        unscored_answers: mpiResult.unscored_answers,
        total_questions: totalQuestions,
        percentage: parseFloat(percentage.toFixed(2))
      };
    });
  }

  setupMiddleware() {
    // Aumentar límite de payload para soportar 1000+ exámenes
    // 50MB límite para payloads grandes
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.text({ type: 'text/plain', limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
    
    // Middleware de logging
    this.app.use((req, res, next) => {
      const payloadSize = req.get('Content-Length') || 0;
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} (${payloadSize} bytes)`);
      next();
    });
  }

  setupRoutes() {
    // Comando GET_ANSWERS
    this.app.get('/answers/:host/:port', async (req, res) => {
      try {
        const { host, port } = req.params;
        const response = await this.sendSHCommand(host, parseInt(port), SH_COMMANDS.GET_ANSWERS);
        
        // Convertir la respuesta del cluster al formato esperado por el frontend
        let answerKeys = {};
        try {
          if (response.data && typeof response.data === 'string') {
            const clusterData = JSON.parse(response.data);
            answerKeys = this.convertClusterAnswersToFrontendFormat(clusterData);
          }
        } catch (parseError) {
          console.warn('Error parseando respuesta del cluster:', parseError.message);
          console.log('Respuesta raw:', response.data);
        }
        
        res.json({
          success: true,
          command: 'GET_ANSWERS',
          answer_keys: answerKeys,
          server_response: response.command_name || 'OK',
          raw_response: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.handleError(res, error, 'GET_ANSWERS');
      }
    });

    // Comando SET_ANSWERS
    this.app.post('/answers/:host/:port', async (req, res) => {
      try {
        const { host, port } = req.params;
        const { answer_keys, answers } = req.body;
        
        // Soportar tanto answer_keys (frontend) como answers (directo)
        const answerData = answer_keys || answers;
        
        if (!answerData) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere el campo "answer_keys" o "answers" en el body',
            expected_format: {
              answer_keys: {
                "EXAM_001": ["A", "B", "C", "D"],
                "EXAM_002": ["B", "A", "D", "C"]
              }
            }
          });
        }

        // Convertir formato del adapter al formato del cluster
        const clusterFormat = this.convertAnswerKeysToClusterFormat(answerData);
        const data = JSON.stringify(clusterFormat);
        console.log(`Enviando SET_ANSWERS a ${host}:${port}:`, data);
        const response = await this.sendSHCommand(host, parseInt(port), SH_COMMANDS.SET_ANSWERS, data);
        
        res.json({
          success: true,
          command: 'SET_ANSWERS',
          response: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.handleError(res, error, 'SET_ANSWERS');
      }
    });

    // Comando REVIEW - Principal para evaluar exámenes
    this.app.post('/review/:host/:port', async (req, res) => {
      try {
        const { host, port } = req.params;
        const { exams } = req.body;
        
        if (!exams || !Array.isArray(exams)) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere un array de "exams" en el body',
            expected_format: {
              exams: [
                {
                  student_id: "12345",
                  exam_id: "E001", 
                  answers: ["A", "B", "C", "D", "A"]
                }
              ]
            }
          });
        }

        console.log(`Procesando ${exams.length} exámenes para evaluación`);
        
        // Convertir formato del frontend al formato del cluster
        const convertedExams = this.convertToClusterFormat(exams);
        console.log(`Exámenes convertidos al formato MPI:`, JSON.stringify(convertedExams, null, 2));
        
        const examData = JSON.stringify(convertedExams);
        const response = await this.sendSHCommand(host, parseInt(port), SH_COMMANDS.REVIEW, examData);
        
        // Parsear la respuesta si es JSON
        let parsedResults = response.data;
        try {
          if (typeof response.data === 'string') {
            parsedResults = JSON.parse(response.data);
          }
        } catch (e) {
          console.warn('Respuesta no es JSON válido, devolviendo como texto');
        }
        
        res.json({
          success: true,
          command: 'REVIEW',
          exams_processed: exams.length,
          results: parsedResults,
          response_info: {
            protocol: response.protocol,
            command_name: response.command_name,
            raw_response: response.raw
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.handleError(res, error, 'REVIEW');
      }
    });

    // Endpoint simplificado para Next.js - POST /grade
    this.app.post('/grade', async (req, res) => {
      try {
        const { host = 'localhost', port = 8080, exams } = req.body;
        
        if (!exams || !Array.isArray(exams)) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere un array de "exams"',
            example: {
              host: 'localhost',
              port: 8080,
              exams: [
                {
                  student_id: "12345",
                  exam_id: "E001",
                  answers: ["A", "B", "C", "D", "A"]
                }
              ]
            }
          });
        }

        console.log(`📝 Evaluando ${exams.length} exámenes en ${host}:${port}`);
        
        // Convertir formato del frontend al formato del cluster
        const convertedExams = this.convertToClusterFormat(exams);
        console.log(`🔄 Conversión completada: ${exams.length} exámenes → formato MPI`);
        
        const examData = JSON.stringify(convertedExams);
        const response = await this.sendSHCommand(host, parseInt(port), SH_COMMANDS.REVIEW, examData);
        
        // Parsear resultados MPI
        let mpiResults = response.data;
        try {
          if (typeof response.data === 'string') {
            mpiResults = JSON.parse(response.data);
          }
        } catch (e) {
          console.warn('⚠️ Respuesta no es JSON, devolviendo como texto');
          mpiResults = [];
        }
        
        // Convertir resultados MPI al formato esperado por el frontend
        const processedResults = this.convertMPIResultsToFrontendFormat(mpiResults, exams);
        
        // Respuesta estructurada para Next.js
        res.json({
          success: true,
          exams_count: exams.length,
          results: {
            mpi_results: mpiResults,
            scores: processedResults
          },
          processing_time: new Date().toISOString(),
          server_response: response.command_name === 'UNKNOWN' ? 'SUCCESS' : response.command_name
        });
      } catch (error) {
        console.error('❌ Error en evaluación:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Comando ECHO
    this.app.post('/echo/:host/:port', async (req, res) => {
      try {
        const { host, port } = req.params;
        const { message } = req.body;
        
        const data = message || 'ping';
        const response = await this.sendSHCommand(host, parseInt(port), SH_COMMANDS.ECHO, data);
        
        res.json({
          success: true,
          command: 'ECHO',
          sent: data,
          response: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.handleError(res, error, 'ECHO');
      }
    });

    // Comando SHUTDOWN
    this.app.post('/shutdown/:host/:port', async (req, res) => {
      try {
        const { host, port } = req.params;
        const response = await this.sendSHCommand(host, parseInt(port), SH_COMMANDS.SHUTDOWN);
        
        res.json({
          success: true,
          command: 'SHUTDOWN',
          response: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.handleError(res, error, 'SHUTDOWN');
      }
    });

    // Comando genérico personalizable
    this.app.post('/command/:host/:port', async (req, res) => {
      try {
        const { host, port } = req.params;
        const { command, data } = req.body;
        
        if (command === undefined || command === null) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere el campo "command" (0-4)'
          });
        }

        if (!Object.values(SH_COMMANDS).includes(parseInt(command))) {
          return res.status(400).json({
            success: false,
            error: `Comando inválido. Debe ser uno de: ${Object.values(SH_COMMANDS).join(', ')}`
          });
        }

        const response = await this.sendSHCommand(host, parseInt(port), parseInt(command), data);
        
        res.json({
          success: true,
          command: COMMAND_NAMES[command] || command,
          response: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.handleError(res, error, 'CUSTOM_COMMAND');
      }
    });

    // Ruta de salud
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        protocol: 'SH',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        connections: this.tcpPool.connections.size,
        commands: SH_COMMANDS
      });
    });

    // Documentación de la API
    this.app.get('/', (req, res) => {
      res.json({
        name: 'SH Protocol HTTP-to-TCP Adapter',
        version: '1.0.0',
        protocol_format: 'SH <command> <length> <data>$',
        endpoints: {
          'POST /grade': '🎯 Endpoint principal para Next.js - Evaluar exámenes',
          'GET /answers/:host/:port': 'Obtener claves de respuesta (GET_ANSWERS)',
          'POST /answers/:host/:port': 'Establecer claves de respuesta (SET_ANSWERS)',
          'POST /review/:host/:port': 'Procesar lote de exámenes (REVIEW)',
          'POST /echo/:host/:port': 'Prueba de conectividad (ECHO)',
          'POST /shutdown/:host/:port': 'Cierre ordenado del sistema (SHUTDOWN)',
          'POST /command/:host/:port': 'Comando genérico con { command: 0-4, data: "..." }',
          'GET /health': 'Estado del servidor',
          'GET /': 'Esta documentación'
        },
        nextjs_usage: {
          endpoint: 'POST /grade',
          example: {
            host: 'localhost',
            port: 8080,
            exams: [
              {
                student_id: "12345",
                exam_id: "E001",
                answers: ["A", "B", "C", "D", "A"]
              }
            ]
          }
        },
        commands: SH_COMMANDS
      });
    });
  }

  /**
   * Construye un mensaje del protocolo SH
   * Formato: "SH <command> <length> <data>$"
   */
  buildSHMessage(command, data = '') {
    const dataStr = String(data);
    const length = Buffer.byteLength(dataStr, 'utf8');
    return `SH ${command} ${length} ${dataStr}$`;
  }

  /**
   * Parsea una respuesta del protocolo SH
   */
  parseSHResponse(response) {
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

  async sendSHCommand(host, port, command, data = '') {
    console.log(`Enviando comando SH ${COMMAND_NAMES[command] || command} a ${host}:${port}`);
    
    return new Promise(async (resolve, reject) => {
      let socket;
      let timeoutId;
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
        const onData = (chunk) => {
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

        const onError = (error) => {
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
        console.error(`Error enviando comando SH: ${error.message}`);
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  handleError(res, error, command) {
    console.error(`Error en comando ${command}:`, error.message);
    res.status(500).json({
      success: false,
      command: command,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  start(port = 3001) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`[OK] Adaptador SH Protocol HTTP-to-TCP ejecutándose en puerto ${port}`);
        console.log(`[OK] Endpoints disponibles:`);
        console.log(`   🎯 POST http://localhost:${port}/grade - Endpoint principal para Next.js`);
        console.log(`   📚 GET  http://localhost:${port}/ - Documentación completa`);
        console.log(`   ❤️  GET  http://localhost:${port}/health - Estado del servidor`);
        console.log(`\n🚀 Para Next.js, usa: POST http://localhost:${port}/grade`);
        console.log(`   Body: { "exams": [{"student_id": "123", "answers": ["A","B",...]}] }`);
        console.log(`   Host/Port opcionales (default: localhost:8080)`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      await promisify(this.server.close.bind(this.server))();
    }
    this.tcpPool.closeAll();
    console.log('[STOP] Servidor detenido');
  }
}

// Uso del adaptador
async function main() {
  const adapter = new SHProtocolAdapter({
    timeout: 10000
  });

  await adapter.start(3001);

  // Manejo graceful de cierre
  process.on('SIGINT', async () => {
    console.warn('\n🛑 Cerrando servidor...');
    await adapter.stop();
    process.exit(0);
  });
}

// Iniciar si se ejecuta directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SHProtocolAdapter, SH_COMMANDS };