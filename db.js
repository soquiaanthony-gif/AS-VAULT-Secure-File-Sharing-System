// In-memory store — replace with a real DB for production
module.exports = {
  users: [], // { id, username, email, passwordHash, publicKey, encryptedPrivateKey, createdAt }
  files: [], // { id, ownerId, filename, originalName, mimeType, size, encryptedKey, iv, createdAt }
};
