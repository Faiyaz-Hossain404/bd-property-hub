import { EventEmitter } from 'node:events';
import { installProcessGuards, type GuardLogger, type ProcessGuards } from './process-guards';

describe('installProcessGuards', () => {
  let target: EventEmitter;
  let logger: jest.Mocked<GuardLogger>;
  let onFatal: jest.Mock;
  let guards: ProcessGuards;

  beforeEach(() => {
    target = new EventEmitter();
    logger = { warn: jest.fn(), error: jest.fn() };
    onFatal = jest.fn();
    guards = installProcessGuards({ logger, onFatal, target });
  });

  afterEach(() => guards.dispose());

  const transientError = (): Error =>
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27017'), { code: 'ECONNREFUSED' });

  describe('uncaughtException', () => {
    it('survives a transient database fault without shutting down', () => {
      target.emit('uncaughtException', transientError());

      expect(onFatal).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('staying up'));
    });

    it('shuts down on a genuine application error', () => {
      const bug = new TypeError('cannot read properties of undefined');

      target.emit('uncaughtException', bug);

      expect(onFatal).toHaveBeenCalledWith(bug);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('shutting down'),
        bug.stack,
      );
    });

    it('does not start a second shutdown while the first is draining', () => {
      target.emit('uncaughtException', new TypeError('first'));
      target.emit('uncaughtException', new TypeError('second'));

      expect(onFatal).toHaveBeenCalledTimes(1);
    });

    it('still survives a transient fault raised during shutdown', () => {
      target.emit('uncaughtException', new TypeError('fatal'));
      onFatal.mockClear();

      target.emit('uncaughtException', transientError());

      expect(onFatal).not.toHaveBeenCalled();
    });
  });

  describe('unhandledRejection', () => {
    it('never shuts the process down, even for an application bug', () => {
      target.emit('unhandledRejection', new TypeError('forgot to await'));

      expect(onFatal).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled promise rejection'),
        expect.any(String),
      );
    });

    it('logs a transient fault as a warning rather than an error', () => {
      target.emit('unhandledRejection', transientError());

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('staying up'));
    });

    it('handles a rejection with a non-Error value', () => {
      target.emit('unhandledRejection', 'something went wrong');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('something went wrong'),
        undefined,
      );
    });
  });

  it('detaches both listeners on dispose', () => {
    guards.dispose();

    expect(target.listenerCount('uncaughtException')).toBe(0);
    expect(target.listenerCount('unhandledRejection')).toBe(0);
  });
});
