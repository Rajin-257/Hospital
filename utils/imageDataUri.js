const path = require('path');
const fs = require('fs');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

function resolvePublicFilePath(storedPath, publicRoot) {
  if (!storedPath) {
    return null;
  }

  const relativePath = String(storedPath).replace(/^\//, '');
  const filePath = path.join(publicRoot, relativePath);
  return fs.existsSync(filePath) ? filePath : null;
}

function filePathToDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext] || 'image/jpeg';
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

function storedPathToDataUri(storedPath, publicRoot) {
  const filePath = resolvePublicFilePath(storedPath, publicRoot);
  return filePathToDataUri(filePath);
}

module.exports = {
  resolvePublicFilePath,
  filePathToDataUri,
  storedPathToDataUri
};
