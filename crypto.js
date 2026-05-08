const forge = require('node-forge');

// Generate RSA-2048 key pair; private key AES-encrypted with user's password
function generateKeyPair(password) {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

  const salt = forge.random.getBytesSync(16);
  const key  = forge.pkcs5.pbkdf2(password, salt, 10000, 32);
  const iv   = forge.random.getBytesSync(16);

  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(forge.pki.privateKeyToPem(keypair.privateKey)));
  cipher.finish();

  return {
    publicKeyPem,
    encryptedPrivateKey: {
      salt: forge.util.encode64(salt),
      iv:   forge.util.encode64(iv),
      data: forge.util.encode64(cipher.output.getBytes()),
    },
  };
}

// Recover RSA private key using password
function decryptPrivateKey(encryptedPrivateKey, password) {
  const salt = forge.util.decode64(encryptedPrivateKey.salt);
  const iv   = forge.util.decode64(encryptedPrivateKey.iv);
  const data = forge.util.decode64(encryptedPrivateKey.data);
  const key  = forge.pkcs5.pbkdf2(password, salt, 10000, 32);

  const decipher = forge.cipher.createDecipher('AES-CBC', key);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(data));
  decipher.finish();

  return forge.pki.privateKeyFromPem(decipher.output.toString());
}

// Encrypt file: AES-256-CBC + RSA-OAEP key wrap
function encryptFile(fileBuffer, publicKeyPem) {
  const aesKey = forge.random.getBytesSync(32);
  const iv     = forge.random.getBytesSync(16);

  const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(fileBuffer));
  cipher.finish();

  const encryptedAesKey = forge.pki.publicKeyFromPem(publicKeyPem)
    .encrypt(aesKey, 'RSA-OAEP', { md: forge.md.sha256.create() });

  return {
    encryptedFile: Buffer.from(cipher.output.getBytes(), 'binary'),
    encryptedKey:  forge.util.encode64(encryptedAesKey),
    iv:            forge.util.encode64(iv),
  };
}

// Decrypt file: RSA-OAEP unwrap + AES-256-CBC decrypt
function decryptFile(encryptedBuffer, encryptedKeyB64, ivB64, privateKey) {
  const aesKey = privateKey.decrypt(
    forge.util.decode64(encryptedKeyB64), 'RSA-OAEP', { md: forge.md.sha256.create() }
  );

  const decipher = forge.cipher.createDecipher('AES-CBC', aesKey);
  decipher.start({ iv: forge.util.decode64(ivB64) });
  decipher.update(forge.util.createBuffer(encryptedBuffer.toString('binary')));
  decipher.finish();

  return Buffer.from(decipher.output.getBytes(), 'binary');
}

module.exports = { generateKeyPair, decryptPrivateKey, encryptFile, decryptFile };
