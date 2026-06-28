import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ListingMediaUploadTicket } from '@bdph/types';
import {
  buildCloudinaryDeliveryUrl,
  parseCloudinaryUrl,
  signCloudinaryParams,
  verifyCloudinaryUpload,
  type CloudinaryCredentials,
} from './cloudinary-signature';

// A verified, committed upload — built only after the server confirms the
// authenticity of Cloudinary's signed response. `url` is server-built (never
// taken from the client).
export interface VerifiedUpload {
  publicId: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  url: string;
}

export interface VerifyUploadInput {
  publicId: string;
  version: number;
  signature: string;
  resourceType: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

// Thin Cloudinary authenticity/URL layer over the pure helpers in
// cloudinary-signature.ts. Credentials are read once from CLOUDINARY_URL; when
// absent, the service reports "not configured" so upload routes 503 cleanly
// instead of the app failing to boot.
@Injectable()
export class CloudinaryService {
  private readonly credentials: CloudinaryCredentials | null;

  constructor(config: ConfigService) {
    this.credentials = parseCloudinaryUrl(config.get<string>('CLOUDINARY_URL'));
  }

  isConfigured(): boolean {
    return this.credentials !== null;
  }

  // Mint a short-lived signature so the browser can upload one file directly to
  // Cloudinary under `folder`. The file bytes never pass through this server.
  createUploadSignature(folder: string): ListingMediaUploadTicket {
    const creds = this.requireCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams({ folder, timestamp }, creds.apiSecret);
    return { cloudName: creds.cloudName, apiKey: creds.apiKey, timestamp, folder, signature };
  }

  // Verify the upload response the client echoes back genuinely came from
  // Cloudinary, then return a descriptor with a server-built delivery URL. Does
  // NOT apply listing policy (folder ownership, format/size/count caps) — that is
  // the caller's responsibility.
  verifyUpload(input: VerifyUploadInput): VerifiedUpload {
    const creds = this.requireCredentials();
    if (input.resourceType !== 'image') {
      throw new BadRequestException('Only image uploads are supported');
    }
    if (!verifyCloudinaryUpload(input.publicId, input.version, input.signature, creds.apiSecret)) {
      throw new BadRequestException('Upload could not be verified');
    }
    return {
      publicId: input.publicId,
      format: input.format,
      bytes: input.bytes,
      width: input.width ?? null,
      height: input.height ?? null,
      url: buildCloudinaryDeliveryUrl(creds.cloudName, input.publicId),
    };
  }

  private requireCredentials(): CloudinaryCredentials {
    if (!this.credentials) {
      throw new ServiceUnavailableException('Media uploads are not configured');
    }
    return this.credentials;
  }
}
