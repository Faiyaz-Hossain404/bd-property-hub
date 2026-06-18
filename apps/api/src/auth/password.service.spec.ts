import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes to an argon2id string distinct from the input', async () => {
    const hashed = await service.hash('s3cret-pass');

    expect(hashed).not.toBe('s3cret-pass');
    expect(hashed.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies a correct password and rejects a wrong one', async () => {
    const hashed = await service.hash('s3cret-pass');

    expect(await service.verify(hashed, 's3cret-pass')).toBe(true);
    expect(await service.verify(hashed, 'wrong-pass')).toBe(false);
  });
});
