const fs = require('fs');
const path = require('path');

function createSimplePNG(width, height, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function createChunk(type, data) {
    const typeBytes = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);

    const crcData = Buffer.concat([typeBytes, data]);
    const crcValue = crc32(crcData);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcValue);

    return Buffer.concat([length, typeBytes, data, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b);
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);

  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIconWithBorder(width, height, r, g, b) {
  const png = [];
  const border = 2;

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function createChunk(type, data) {
    const typeBytes = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeBytes, data]);
    const crcValue = crc32(crcData);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcValue);
    return Buffer.concat([length, typeBytes, data, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      const isBorder = x < border || x >= width - border || y < border || y >= height - border;
      if (isBorder) {
        rawData.push(200, 200, 200, 255);
      } else {
        rawData.push(r, g, b, 255);
      }
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);

  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcValue = crc32(crcData);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcValue);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function createCirclePNG(size, r, g, b) {
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = [];
  const center = size / 2;
  const radius = size / 2 - 2;

  for (let y = 0; y < size; y++) {
    rawData.push(0);
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        rawData.push(r, g, b, 255);
      } else {
        rawData.push(0, 0, 0, 0);
      }
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);

  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = './images';

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('开始创建图标文件...');

fs.writeFileSync(path.join(iconsDir, 'home.png'), createCirclePNG(48, 200, 200, 200));
fs.writeFileSync(path.join(iconsDir, 'home-active.png'), createCirclePNG(48, 102, 187, 106));
fs.writeFileSync(path.join(iconsDir, 'chat.png'), createCirclePNG(48, 200, 200, 200));
fs.writeFileSync(path.join(iconsDir, 'chat-active.png'), createCirclePNG(48, 102, 187, 106));
fs.writeFileSync(path.join(iconsDir, 'news.png'), createCirclePNG(48, 200, 200, 200));
fs.writeFileSync(path.join(iconsDir, 'news-active.png'), createCirclePNG(48, 102, 187, 106));
fs.writeFileSync(path.join(iconsDir, 'user.png'), createCirclePNG(48, 200, 200, 200));
fs.writeFileSync(path.join(iconsDir, 'user-active.png'), createCirclePNG(48, 102, 187, 106));

fs.writeFileSync(path.join(iconsDir, 'avatar1.png'), createCirclePNG(80, 255, 182, 193));
fs.writeFileSync(path.join(iconsDir, 'avatar2.png'), createCirclePNG(80, 186, 220, 254));
fs.writeFileSync(path.join(iconsDir, 'avatar3.png'), createCirclePNG(80, 255, 218, 185));
fs.writeFileSync(path.join(iconsDir, 'avatar4.png'), createCirclePNG(80, 144, 238, 144));
fs.writeFileSync(path.join(iconsDir, 'default-avatar.png'), createCirclePNG(80, 200, 200, 200));

fs.writeFileSync(path.join(iconsDir, 'note1.jpg'), createSimplePNG(200, 200, 255, 255, 200));
fs.writeFileSync(path.join(iconsDir, 'experiment1.jpg'), createSimplePNG(200, 200, 200, 255, 255));
fs.writeFileSync(path.join(iconsDir, 'experiment2.jpg'), createSimplePNG(200, 200, 255, 200, 255));
fs.writeFileSync(path.join(iconsDir, 'news1.jpg'), createSimplePNG(200, 150, 100, 150, 200));
fs.writeFileSync(path.join(iconsDir, 'news2.jpg'), createSimplePNG(200, 150, 150, 200, 255));
fs.writeFileSync(path.join(iconsDir, 'news3.jpg'), createSimplePNG(200, 150, 200, 150, 100));
fs.writeFileSync(path.join(iconsDir, 'news4.jpg'), createSimplePNG(200, 150, 150, 100, 200));
fs.writeFileSync(path.join(iconsDir, 'news5.jpg'), createSimplePNG(200, 150, 200, 200, 255));

console.log('所有图标文件已重新创建成功！');