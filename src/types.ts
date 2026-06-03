export type Level = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG' | 'TRACE';

export interface Row {
  container: string;
  content: string;
  level: Level | null;
  ts: number | null;
  isStack: boolean;
  dups?: number;
}

export interface ErrorOut {
  container: string;
  level: Level;
  message: string;
  context: string;
  when: string;
  repeat: number;
}

export interface EventOut {
  container: string;
  type: 'up' | 'down';
  msg: string;
}

export interface SuccessOut {
  container: string;
  msg: string;
  when: string;
}

export interface Result {
  summary: string;
  stats: { in: number; kept: number; dropped: number };
  errors: ErrorOut[];
  events: EventOut[];
  last_success: SuccessOut | null;
}

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
