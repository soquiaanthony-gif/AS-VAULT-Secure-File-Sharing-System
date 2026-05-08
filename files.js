const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuid } = require('uuid');
const db     = require('../db');
const auth   = require('../middleware/auth');
const { encryptFile, decryptFile, decryptPrivateKey } = require('../crypto');

const UPLOADS = path.join(__dirname, '../uploads');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/files/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const user = db.users.find(u => u.id === req.user.id);
    const { encryptedFile, encryptedKey, iv } = encryptFile(req.file.buffer, user.publicKey);

    const fileId = uuid();
    fs.writeFileSync(path.join(UPLOADS, `${fileId}.enc`), encryptedFile);

    const record = { id: fileId, ownerId: user.id, filename: `${fileId}.enc`,
      originalName: req.file.originalname, mimeType: req.file.mimetype,
      size: req.file.size, encryptedKey, iv, createdAt: new Date().toISOString() };
    db.files.push(record);

    res.status(201).json({ message: 'Uploaded and encrypted', file: { id: record.id, originalName: record.originalName, size: record.size, createdAt: record.createdAt } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files
router.get('/', auth, (req, res) => {
  const files = db.files
    .filter(f => f.ownerId === req.user.id)
    .map(({ id, originalName, size, mimeType, createdAt }) => ({ id, originalName, size, mimeType, createdAt }));
  res.json({ files });
});

// POST /api/files/:id/download
router.post('/:id/download', auth, (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const record = db.files.find(f => f.id === req.params.id);
    if (!record) return res.status(404).json({ error: 'File not found' });
    if (record.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const user = db.users.find(u => u.id === req.user.id);

    let privateKey;
    try { privateKey = decryptPrivateKey(user.encryptedPrivateKey, password); }
    catch { return res.status(401).json({ error: 'Wrong password' }); }

    const encryptedBuffer = fs.readFileSync(path.join(UPLOADS, record.filename));
    const decrypted = decryptFile(encryptedBuffer, record.encryptedKey, record.iv, privateKey);

    res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.send(decrypted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files/:id
router.delete('/:id', auth, (req, res) => {
  const idx = db.files.findIndex(f => f.id === req.params.id && f.ownerId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'File not found' });

  const [record] = db.files.splice(idx, 1);
  const filePath = path.join(UPLOADS, record.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.json({ message: 'Deleted' });
});

module.exports = router;
