import type { OntologicalSchema } from '../types';

const GLB_MAGIC = 0x46546C67; // 'glTF'
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4E4F534A; // 'JSON'
const BIN_CHUNK_TYPE = 0x004E4942; // 'BIN\0'

// Helper to ensure data length is a multiple of 4
const padBuffer = (data: Uint8Array, paddingChar = 0x20): Uint8Array => {
  const remainder = data.length % 4;
  if (remainder === 0) {
    return data;
  }
  const padding = 4 - remainder;
  const paddedData = new Uint8Array(data.length + padding);
  paddedData.set(data);
  for (let i = 0; i < padding; i++) {
    paddedData[data.length + i] = paddingChar;
  }
  return paddedData;
};

/**
 * Writes the schema into a GLB format ArrayBuffer.
 * @param schema The schema object to serialize.
 * @returns An ArrayBuffer containing the GLB file data.
 */
export const writeGlb = (schema: Omit<OntologicalSchema, 'mooseVersion'>): ArrayBuffer => {
  const schemaWithVersion: OntologicalSchema = {
    mooseVersion: '1.0',
    ...schema,
  };
  const jsonString = JSON.stringify(schemaWithVersion);
  const jsonEncoder = new TextEncoder();
  const jsonData = padBuffer(jsonEncoder.encode(jsonString));

  const jsonChunkLength = jsonData.length;
  
  // Header (12 bytes) + JSON chunk (8 bytes + data)
  const totalLength = 12 + 8 + jsonChunkLength;

  const buffer = new ArrayBuffer(totalLength);
  const dataView = new DataView(buffer);
  let offset = 0;

  // GLB Header
  dataView.setUint32(offset, GLB_MAGIC, true);
  offset += 4;
  dataView.setUint32(offset, GLB_VERSION, true);
  offset += 4;
  dataView.setUint32(offset, totalLength, true);
  offset += 4;

  // JSON Chunk
  dataView.setUint32(offset, jsonChunkLength, true);
  offset += 4;
  dataView.setUint32(offset, JSON_CHUNK_TYPE, true);
  offset += 4;
  new Uint8Array(buffer, offset).set(jsonData);

  return buffer;
};

/**
 * Reads a GLB format ArrayBuffer and parses the schema from its JSON chunk.
 * @param arrayBuffer The ArrayBuffer of the GLB file.
 * @returns A Promise that resolves with the parsed OntologicalSchema object.
 */
export const readGlb = (arrayBuffer: ArrayBuffer): Promise<OntologicalSchema> => {
  return new Promise((resolve, reject) => {
    const dataView = new DataView(arrayBuffer);
    let offset = 0;

    // Header validation
    if (arrayBuffer.byteLength < 12) {
      return reject(new Error('Invalid GLB: File is too short.'));
    }
    const magic = dataView.getUint32(offset, true);
    offset += 4;
    if (magic !== GLB_MAGIC) {
      return reject(new Error('Invalid GLB: Incorrect magic number.'));
    }
    const version = dataView.getUint32(offset, true);
    offset += 4;
    if (version !== GLB_VERSION) {
      return reject(new Error(`Unsupported GLB version: ${version}. Only version 2 is supported.`));
    }
    const totalLength = dataView.getUint32(offset, true);
    offset += 4;
    if (totalLength !== arrayBuffer.byteLength) {
        return reject(new Error('Invalid GLB: File length in header does not match actual file length.'));
    }

    // Read first chunk (should be JSON)
    if (offset + 8 > arrayBuffer.byteLength) {
        return reject(new Error('Invalid GLB: Missing chunk header.'));
    }
    const jsonChunkLength = dataView.getUint32(offset, true);
    offset += 4;
    const jsonChunkType = dataView.getUint32(offset, true);
    offset += 4;

    if (jsonChunkType !== JSON_CHUNK_TYPE) {
      return reject(new Error('Invalid GLB: The first chunk must be JSON.'));
    }

    if (offset + jsonChunkLength > arrayBuffer.byteLength) {
        return reject(new Error('Invalid GLB: JSON chunk length exceeds file bounds.'));
    }
    const jsonData = new Uint8Array(arrayBuffer, offset, jsonChunkLength);
    const jsonDecoder = new TextDecoder('utf-8');
    const jsonString = jsonDecoder.decode(jsonData);

    try {
      const parsed = JSON.parse(jsonString);
      // Check for MOOSE signature
      if (parsed.mooseVersion === '1.0' && parsed.relationshipMatrix && typeof parsed.relationshipMatrix === 'object') {
        resolve(parsed as OntologicalSchema);
      } else {
        // It's valid JSON, but not our schema (likely a standard glTF scene definition).
        reject(new Error('Not a MOOSE ontology file: signature missing.'));
      }
    } catch (e) {
      reject(new Error('Failed to parse JSON content from GLB file.'));
    }
  });
};