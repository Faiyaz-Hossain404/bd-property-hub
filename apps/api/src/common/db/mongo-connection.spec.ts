import { EventEmitter } from 'node:events';
import type { Logger } from '@nestjs/common';
import type { Connection } from 'mongoose';
import {
  attachConnectionLogging,
  computeBackoffDelay,
  waitForMongo,
  type MongoProbeDeps,
  type MongoRetrySettings,
} from './mongo-connection';

const settings: MongoRetrySettings = {
  uri: 'mongodb://localhost:27017',
  dbName: 'bdph',
  maxAttempts: 4,
  baseDelayMs: 100,
  maxDelayMs: 1_000,
  serverSelectionTimeoutMs: 10_000,
};

const refusedConnection = (): Error =>
  Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27017'), { code: 'ECONNREFUSED' });

function makeLogger(): jest.Mocked<Pick<Logger, 'log' | 'warn'>> {
  return { log: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<
    Pick<Logger, 'log' | 'warn'>
  >;
}

describe('computeBackoffDelay', () => {
  // random() pinned to 1 so the assertions describe the top of each window.
  const alwaysMax = () => 1;

  it('doubles the window on each successive attempt', () => {
    expect(computeBackoffDelay(1, 100, 10_000, alwaysMax)).toBe(100);
    expect(computeBackoffDelay(2, 100, 10_000, alwaysMax)).toBe(200);
    expect(computeBackoffDelay(3, 100, 10_000, alwaysMax)).toBe(400);
    expect(computeBackoffDelay(4, 100, 10_000, alwaysMax)).toBe(800);
  });

  it('never exceeds the configured ceiling', () => {
    expect(computeBackoffDelay(20, 100, 5_000, alwaysMax)).toBe(5_000);
  });

  it('keeps at least half the window fixed so the delay always grows', () => {
    // Full jitter could return ~0 and spin; equal jitter cannot.
    expect(computeBackoffDelay(3, 100, 10_000, () => 0)).toBe(200);
  });
});

describe('waitForMongo', () => {
  function makeDeps(probe: MongoProbeDeps['probe']): MongoProbeDeps & { sleep: jest.Mock } {
    return { probe, sleep: jest.fn().mockResolvedValue(undefined), random: () => 1 };
  }

  it('returns immediately when the database is already reachable', async () => {
    const probe = jest.fn().mockResolvedValue(undefined);
    const deps = makeDeps(probe);

    await waitForMongo(settings, makeLogger(), deps);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it('retries with growing delays until the database accepts connections', async () => {
    const probe = jest
      .fn()
      .mockRejectedValueOnce(refusedConnection())
      .mockRejectedValueOnce(refusedConnection())
      .mockResolvedValue(undefined);
    const deps = makeDeps(probe);

    await waitForMongo(settings, makeLogger(), deps);

    expect(probe).toHaveBeenCalledTimes(3);
    expect(deps.sleep.mock.calls).toEqual([[100], [200]]);
  });

  it('gives up after the configured number of attempts', async () => {
    const probe = jest.fn().mockRejectedValue(refusedConnection());
    const logger = makeLogger();

    await waitForMongo(settings, logger, makeDeps(probe));

    expect(probe).toHaveBeenCalledTimes(settings.maxAttempts);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('still unreachable'));
  });

  it('fails fast on a non-transient error instead of burning the budget', async () => {
    // Bad credentials will never resolve on their own — retrying only delays
    // a boot that is going to fail anyway.
    const probe = jest.fn().mockRejectedValue(new Error('Authentication failed'));
    const deps = makeDeps(probe);

    await waitForMongo(settings, makeLogger(), deps);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it('caps a probe attempt below the runtime server selection timeout', async () => {
    const probe = jest.fn().mockResolvedValue(undefined);

    await waitForMongo(settings, makeLogger(), makeDeps(probe));

    expect(probe).toHaveBeenCalledWith(settings.uri, 5_000);
  });
});

describe('attachConnectionLogging', () => {
  it('subscribes to error so a dropped socket cannot become an uncaught exception', () => {
    const connection = new EventEmitter() as unknown as Connection;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;

    attachConnectionLogging(connection, logger);

    // Without a listener, EventEmitter re-throws an 'error' event.
    expect(() => connection.emit('error', new Error('socket hang up'))).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('socket hang up'));
  });

  it('warns when the connection drops and logs when it comes back', () => {
    const connection = new EventEmitter() as unknown as Connection;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;

    attachConnectionLogging(connection, logger);
    connection.emit('disconnected');
    connection.emit('reconnected');

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('reconnected'));
  });
});
