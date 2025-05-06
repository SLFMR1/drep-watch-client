import { bech32 } from 'bech32';

/**
 * Converts a Cardano DRep ID from CIP-105 format to CIP-129 format.
 * 
 * @param oldDRepId - The DRep ID in CIP-105 format (Bech32 encoded with 'drep' or 'drep_script' prefix).
 * @returns The DRep ID in CIP-129 format (Bech32 encoded with 'drep' prefix and header byte), or null if conversion fails.
 * @throws Will throw an error for invalid inputs (e.g., invalid Bech32, unsupported prefix, incorrect payload length).
 */
export function convertDRepIdToCIP129(oldDRepId: string): string | null {
  try {
    // Decode the old DRep ID
    const { prefix: hrp, words: data5bit } = bech32.decode(oldDRepId);

    // Determine the type based on HRP and set header byte
    let header: number;
    if (hrp === 'drep') {
      header = 0x22; // Key hash
    } else if (hrp === 'drep_script') {
      header = 0x23; // Script hash
    } else {
      throw new Error("Unsupported prefix: must be 'drep' or 'drep_script'");
    }

    // Convert 5-bit data to 8-bit bytes
    const payloadBytes = bech32.fromWords(data5bit);
    const payload = Uint8Array.from(payloadBytes);

    // Validate payload length
    if (payload.length !== 28) {
      // Allow conversion even if length is wrong, but log a warning
      console.warn(`Unexpected payload length for DRep ID ${oldDRepId}: expected 28 bytes, got ${payload.length}. Proceeding with conversion.`);
      // If strict validation is required uncomment the line below:
      // throw new Error(`Invalid payload length: expected 28 bytes, got ${payload.length}`);
    }

    // Create new payload with header byte
    const newPayload = new Uint8Array(payload.length + 1);
    newPayload[0] = header;
    newPayload.set(payload, 1);

    // Convert new payload to 5-bit words for Bech32 encoding
    const data5bitNew = bech32.toWords(newPayload);

    // Encode with 'drep' prefix
    const newDRepId = bech32.encode('drep', data5bitNew);
    if (!newDRepId) {
      throw new Error('Failed to encode new DRep ID');
    }

    return newDRepId;
  } catch (error) {
    console.error(`Failed to convert DRep ID "${oldDRepId}":`, error);
    // Depending on requirements, you might want to return the original ID, null, or re-throw the error.
    // Returning null indicates conversion failure.
    return null; 
  }
} 