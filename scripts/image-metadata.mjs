import { readFile } from 'node:fs/promises'

function readUInt24(buffer, offset) {
  return (buffer[offset] << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2]
}

function readJpegDimensions(buffer) {
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      }
    }
    offset += 2 + length
  }
  return { width: null, height: null }
}

function readPngDimensions(buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function readWebpDimensions(buffer) {
  if (buffer.toString('ascii', 12, 16) === 'VP8X') {
    return {
      width: 1 + readUInt24(buffer, 24),
      height: 1 + readUInt24(buffer, 27),
    }
  }
  return { width: null, height: null }
}

export async function readImageMetadata(filePath) {
  const buffer = await readFile(filePath)
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
  let dimensions = { width: null, height: null }
  if (extension === 'png' && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    dimensions = readPngDimensions(buffer)
  } else if (extension === 'jpg' || extension === 'jpeg') {
    dimensions = readJpegDimensions(buffer)
  } else if (extension === 'webp' && buffer.toString('ascii', 0, 4) === 'RIFF') {
    dimensions = readWebpDimensions(buffer)
  }
  return {
    bytes: buffer.byteLength,
    format: extension,
    ...dimensions,
  }
}
