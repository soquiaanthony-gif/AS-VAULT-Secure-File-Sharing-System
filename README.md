-** AS VAULT Secure File Sharing System with Hybrid Encryption (AES + RSA)***

---

## Overview

VaultFS is a web-based secure file sharing system that uses **hybrid encryption**:
- **AES-256-CBC** to encrypt file content (fast, symmetric)
- **RSA-2048 OAEP/SHA-256** to encrypt the AES session key (secure key exchange)

The server **never stores plaintext** — files are encrypted client-side before upload and can only be decrypted with the user's RSA private key (which is itself encrypted with their password).

---

## Encryption Architecture

```
UPLOAD:
  File → [AES-256-CBC with random key] → Encrypted File (stored on disk)
  AES Key → [RSA-2048 OAEP encrypt with user's Public Key] → Encrypted AES Key (stored in DB)

DOWNLOAD:
  Encrypted AES Key → [RSA-2048 OAEP decrypt with user's Private Key] → AES Key
  Encrypted File → [AES-256-CBC decrypt with AES Key] → Original File
```

---

## Setup Instructions

### Prerequisites
- Node.js v18 or higher
- npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd secure-fileshare

# Install backend dependencies
cd backend
npm install

# Start the server
node server.js
```

The app will run at: **http://localhost:3000**

---

## Project Structure

```
secure-fileshare/
├── backend/
│   ├── server.js          # Express server entry point
│   ├── db.js              # In-memory data store
│   ├── crypto.js          # AES + RSA hybrid encryption logic
│   ├── .env               # Environment variables
│   ├── middleware/
│   │   └── auth.js        # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js        # Register / Login endpoints
│   │   └── files.js       # Upload / Download / Delete endpoints
│   └── uploads/           # Encrypted file storage (auto-created)
└── frontend/
    └── public/
        └── index.html     # Single-page frontend application
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register user, generate RSA key pair |
| POST | `/api/auth/login` | No | Login, return JWT + encrypted private key |
| GET | `/api/files` | JWT | List user's encrypted files |
| POST | `/api/files/upload` | JWT | Encrypt and upload a file |
| POST | `/api/files/:id/download` | JWT | Decrypt and download a file |
| DELETE | `/api/files/:id` | JWT | Delete an encrypted file |

---

## Algorithm Justification

### Why AES?
AES (Advanced Encryption Standard) is a symmetric cipher — it uses the same key to encrypt and decrypt. AES-256 is extremely fast on modern hardware and provides 256-bit security, making brute-force computationally infeasible. It's ideal for encrypting large file payloads.

### Why RSA?
RSA is an asymmetric cipher — data encrypted with a public key can only be decrypted with the corresponding private key. This enables **secure key distribution**: the server can store a user's public key without being able to decrypt their files. RSA-2048 provides ~112-bit equivalent security.

### Why Hybrid?
- RSA is too slow for large data (mathematical operations on large numbers)
- AES is fast but requires a shared secret key — how do you share it securely?
- **Hybrid encryption** solves both**: AES encrypts the data (fast), RSA encrypts the AES key (secure)

This is the same approach used by TLS/HTTPS, PGP email, and SSH.

---

## Security Features

- Passwords hashed with **bcrypt** (cost factor 12)
- RSA private keys encrypted with **AES-CBC + PBKDF2** using the user's password
- **JWT** authentication with 24-hour expiry
- File access control — users can only access their own files
- Encrypted files stored with UUID filenames (no information leakage)
- `node-forge` cryptographic library (well-audited, no native binaries)

