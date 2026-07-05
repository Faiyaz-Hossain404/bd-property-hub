import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { signCloudinaryParams } from './cloudinary-signature';

// Fake ConfigService that only knows CLOUDINARY_URL.
function configWith(url: string | undefined): ConfigService {
  return { get: (key: string) => (key === 'CLOUDINARY_URL' ? url : undefined) } as ConfigService;
}

const CLOUD_URL = 'cloudinary://key123:secret456@mycloud';

function mockFetchOnce(payload: unknown): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    json: async () => payload,
  } as unknown as Response);
}

describe('CloudinaryService.destroy', () => {
  afterEach(() => jest.restoreAllMocks());

  it('POSTs a correctly-signed destroy to the account cloud and resolves on "ok"', async () => {
    const service = new CloudinaryService(configWith(CLOUD_URL));
    const fetchSpy = mockFetchOnce({ result: 'ok' });

    await expect(service.destroy('listings/64b/photo-abc')).resolves.toBeUndefined();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/mycloud/image/destroy');
    expect(init.method).toBe('POST');

    // The body must carry the api_key and a signature this same secret produces
    // over (public_id, timestamp) — proving we authenticate the delete correctly.
    const body = init.body as URLSearchParams;
    expect(body.get('api_key')).toBe('key123');
    expect(body.get('public_id')).toBe('listings/64b/photo-abc');
    const expected = signCloudinaryParams(
      { public_id: 'listings/64b/photo-abc', timestamp: Number(body.get('timestamp')) },
      'secret456',
    );
    expect(body.get('signature')).toBe(expected);
  });

  it('treats "not found" as success (idempotent re-delete)', async () => {
    const service = new CloudinaryService(configWith(CLOUD_URL));
    mockFetchOnce({ result: 'not found' });
    await expect(service.destroy('listings/x/gone')).resolves.toBeUndefined();
  });

  it('throws on an unexpected result so the caller can log', async () => {
    const service = new CloudinaryService(configWith(CLOUD_URL));
    mockFetchOnce({ result: 'error' });
    await expect(service.destroy('listings/x/y')).rejects.toThrow(/unexpected result/i);
  });

  it('throws on a transport failure', async () => {
    const service = new CloudinaryService(configWith(CLOUD_URL));
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(service.destroy('listings/x/y')).rejects.toThrow(/destroy request failed/i);
  });

  it('throws ServiceUnavailable when Cloudinary is not configured', async () => {
    const service = new CloudinaryService(configWith(undefined));
    await expect(service.destroy('listings/x/y')).rejects.toThrow(/not configured/i);
  });
});
