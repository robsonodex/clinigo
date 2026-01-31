/**
 * Face Descriptor Encryption Utilities
 * Extends existing encryption.ts for biometric data
 */

import { encrypt, decrypt } from './encryption';

/**
 * Encrypt a face descriptor (Float32Array of 128 dimensions)
 * Converts to base64, then encrypts with AES-256-GCM
 */
export function encryptFaceDescriptor(descriptor: Float32Array): string {
    // Convert Float32Array to base64
    const buffer = Buffer.from(descriptor.buffer);
    const base64 = buffer.toString('base64');

    // Encrypt using existing AES-256-GCM
    return encrypt(base64);
}

/**
 * Decrypt an encrypted face descriptor back to Float32Array
 */
export function decryptFaceDescriptor(encrypted: string): Float32Array {
    // Decrypt using existing AES-256-GCM
    const decrypted = decrypt(encrypted);

    // Convert base64 back to Float32Array
    const buffer = Buffer.from(decrypted, 'base64');
    return new Float32Array(buffer.buffer, buffer.byteOffset, 128);
}

/**
 * Calculate Euclidean distance between two face descriptors
 * Returns: distance (0 = identical, >0.6 = different person)
 */
export function calculateFaceDistance(desc1: Float32Array, desc2: Float32Array): number {
    if (desc1.length !== 128 || desc2.length !== 128) {
        throw new Error('Face descriptors must be 128-dimensional');
    }

    let sum = 0;
    for (let i = 0; i < 128; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

/**
 * Check if two face descriptors match
 * Threshold: 0.6 is standard for face-api.js
 */
export function isFaceMatch(desc1: Float32Array, desc2: Float32Array, threshold = 0.6): boolean {
    return calculateFaceDistance(desc1, desc2) < threshold;
}
