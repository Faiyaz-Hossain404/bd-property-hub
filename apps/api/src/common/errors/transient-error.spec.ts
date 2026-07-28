import { isTransientInfrastructureError } from './transient-error';

describe('isTransientInfrastructureError', () => {
  it('recognises a refused connection by syscall code', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27017'), {
      code: 'ECONNREFUSED',
    });

    expect(isTransientInfrastructureError(error)).toBe(true);
  });

  it('recognises a server selection failure by error name', () => {
    const error = new Error('No replica set members available');
    error.name = 'MongoServerSelectionError';

    expect(isTransientInfrastructureError(error)).toBe(true);
  });

  it('recognises a buffered query that gave up waiting for reconnection', () => {
    const error = new Error('Operation `listings.find()` buffering timed out after 10000ms');

    expect(isTransientInfrastructureError(error)).toBe(true);
  });

  it('recognises a replica set election by its retryable label', () => {
    const error = Object.assign(new Error('not primary'), {
      name: 'MongoServerError',
      errorLabels: ['RetryableWriteError'],
    });

    expect(isTransientInfrastructureError(error)).toBe(true);
  });

  it('unwraps a transient socket error hidden behind a wrapper', () => {
    const socketError = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const wrapper = new Error('Failed to load listings', { cause: socketError });

    expect(isTransientInfrastructureError(wrapper)).toBe(true);
  });

  it('does not treat an application bug as transient', () => {
    expect(isTransientInfrastructureError(new TypeError('x is not a function'))).toBe(false);
  });

  it('does not mistake a numeric Mongo error code for a syscall code', () => {
    // 11000 is a duplicate key — a client error the caller must fix, not retry.
    const error = Object.assign(new Error('E11000 duplicate key error'), {
      name: 'MongoServerError',
      code: 11000,
    });

    expect(isTransientInfrastructureError(error)).toBe(false);
  });

  it('returns false for non-object values instead of throwing', () => {
    expect(isTransientInfrastructureError(null)).toBe(false);
    expect(isTransientInfrastructureError(undefined)).toBe(false);
    expect(isTransientInfrastructureError('ECONNREFUSED')).toBe(false);
  });

  it('terminates on a self-referencing cause chain', () => {
    const error: Error & { cause?: unknown } = new Error('loop');
    error.cause = error;

    expect(isTransientInfrastructureError(error)).toBe(false);
  });
});
