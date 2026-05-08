require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// Create uploads dir if missing
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use('/api/auth',  require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

app.get('/{*splat}', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`AS Vault running → http://localhost:${PORT}`)
);
