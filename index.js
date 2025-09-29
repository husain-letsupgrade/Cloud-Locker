require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./db');
const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
const searchRoutes = require('./routes/search');
const sortRoutes = require('./routes/sort');
const app = express();
app.use(express.json());
app.use(cors());

app.use('/', authRoutes);
app.use('/folders', folderRoutes);
app.use('/files', fileRoutes);
app.use('/', searchRoutes);

app.use('/', sortRoutes);
app.get('/', (req, res) => res.json({ ok: true, message: 'Cloud Locker API' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});