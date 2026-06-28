import type { CommitListingMediaInput, ListingMediaUploadTicket } from '@bdph/types';

// Cloudinary's signed-upload response — only the fields we forward to our API's
// commit step (the server re-verifies the signature before trusting them).
interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

// Upload one image directly to Cloudinary using a server-minted signature — the
// file bytes go straight to Cloudinary, never through our API. Returns the fields
// our commit endpoint needs. Throws on any non-OK response.
export async function uploadImageToCloudinary(
  ticket: ListingMediaUploadTicket,
  file: File,
): Promise<CommitListingMediaInput> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', ticket.apiKey);
  form.append('timestamp', String(ticket.timestamp));
  form.append('folder', ticket.folder);
  form.append('signature', ticket.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${ticket.cloudName}/image/upload`,
    { method: 'POST', body: form },
  );
  if (!response.ok) {
    throw new Error('Cloudinary upload failed');
  }

  const result = (await response.json()) as CloudinaryUploadResponse;
  return {
    publicId: result.public_id,
    version: result.version,
    signature: result.signature,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}
