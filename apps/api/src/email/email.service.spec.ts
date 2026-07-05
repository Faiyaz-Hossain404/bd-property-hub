import { ConfigService } from '@nestjs/config';
import { EmailService, type EmailMessage } from './email.service';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

const MESSAGE: EmailMessage = {
  to: 'user@example.com',
  subject: 'Verify your email',
  html: '<p>hi</p>',
  text: 'hi',
};

describe('EmailService', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('when configured', () => {
    const config = configWith({ RESEND_API_KEY: 're_test_key', EMAIL_FROM: 'BDPH <no-reply@bdph.test>' });

    it('POSTs to Resend with bearer auth and the message body', async () => {
      const service = new EmailService(config);
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

      await expect(service.send(MESSAGE)).resolves.toBeUndefined();

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.resend.com/emails');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({
        from: 'BDPH <no-reply@bdph.test>',
        to: 'user@example.com',
        subject: 'Verify your email',
      });
    });

    it('throws when Resend returns a non-OK status', async () => {
      const service = new EmailService(config);
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, status: 422 } as Response);
      await expect(service.send(MESSAGE)).rejects.toThrow(/status 422/);
    });

    it('throws on a transport failure', async () => {
      const service = new EmailService(config);
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNRESET'));
      await expect(service.send(MESSAGE)).rejects.toThrow(/send failed/i);
    });
  });

  describe('when not configured', () => {
    it('does not call fetch and resolves (dev log fallback)', async () => {
      const service = new EmailService(configWith({ RESEND_API_KEY: undefined }));
      const fetchSpy = jest.spyOn(global, 'fetch');
      await expect(service.send(MESSAGE)).resolves.toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.isConfigured()).toBe(false);
    });
  });
});
