import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

// Maps Mongoose's numeric readyState (0|1|2|3|99) to a label.
const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export interface HealthReport {
  status: 'ok' | 'degraded';
  mongo: string;
  uptime: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  check(): HealthReport {
    const mongo = READY_STATES[this.connection.readyState] ?? 'unknown';
    return {
      status: mongo === 'connected' ? 'ok' : 'degraded',
      mongo,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
