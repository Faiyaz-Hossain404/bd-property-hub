import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id password hashing (SECURITY_ARCHITECTURE.md). @node-rs/argon2 ships
 * prebuilt native binaries, so there is no node-gyp build step. Defaults use
 * the Argon2id variant with OWASP-aligned cost parameters.
 */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain);
  }

  verify(hashString: string, plain: string): Promise<boolean> {
    return verify(hashString, plain);
  }
}
