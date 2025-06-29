export interface ExamData {
  student_id: string;
  exam_id?: string;
  answers: string[];
}

export interface GradeRequest {
  host?: string;
  port?: number;
  exams: ExamData[];
}

export interface GradeResponse {
  success: boolean;
  exams_count: number;
  results: any;
  processing_time: string;
  server_response: string;
}

export interface SHResponse {
  protocol: string;
  command?: number;
  command_name?: string;
  length?: number;
  data: any;
  raw: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  protocol: string;
  uptime: number;
  timestamp: string;
  connections: number;
  commands: number[];
}

export enum SHCommand {
  GET_ANSWERS = 0,
  SET_ANSWERS = 1,
  REVIEW = 2,
  ECHO = 3,
  SHUTDOWN = 4
}

export const COMMAND_NAMES: Record<number, string> = {
  [SHCommand.GET_ANSWERS]: 'GET_ANSWERS',
  [SHCommand.SET_ANSWERS]: 'SET_ANSWERS',
  [SHCommand.REVIEW]: 'REVIEW',
  [SHCommand.ECHO]: 'ECHO',
  [SHCommand.SHUTDOWN]: 'SHUTDOWN'
};