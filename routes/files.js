const express = require('express');
const { nanoid } = require('nanoid');
const auth = require('../middleware/auth');
const { getDB } = require('../db');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const router = express.Router();
router.use(auth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.patch('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const ownerId = req.user.id;
    const fileId = req.params.id;
    const { name, description, tags } = req.body;

    const file = await db.collection('files').findOne({ _id: fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.ownerId !== ownerId) return res.status(403).json({ error: 'Access denied' });

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (description !== undefined) updatedFields.description = description;
    if (tags) updatedFields.tags = Array.isArray(tags) ? tags : tags.split(',');
    updatedFields.updatedAt = new Date();
    updatedFields.version = (file.version || 1) + 1;

    await db.collection('files').updateOne({ _id: fileId }, { $set: updatedFields });

    const updatedFile = await db.collection('files').findOne({ _id: fileId });

    res.json({ message: 'File updated successfully', file: updatedFile });
  } catch (err) {
    next(err);
  }
});
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {

    const db = getDB();
    const ownerId = req.user.id;
    const file = req.file;

    const folderId = req.body.folderId;
    const description = req.body.description || '';
    const tags = req.body.tags ? req.body.tags.split(',') : [];

    if (!file || !folderId) {
      return res.status(400).json({ error: 'File and folderId are required' });
    }

    const fileDoc = {
      _id: nanoid(),
      name: file.originalname,
      folderId,
      ownerId,
      size: file.size,
      fileType: file.mimetype,
      storagePath: path.join(process.env.UPLOAD_DIR, file.filename),
      createdAt: new Date(),
      updatedAt: new Date(),
      starred: false,
      tags,
      description,
      version: 1
    };

    await db.collection('files').insertOne(fileDoc);
    res.status(201).json({ message: 'File uploaded successfully', file: fileDoc });
  } catch (err) {
    next(err);
  }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const ownerId = req.user.id;
    const fileId = req.params.id;

    const file = await db.collection('files').findOne({ _id: fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.ownerId !== ownerId) return res.status(403).json({ error: 'Access denied' });

    await db.collection('files').deleteOne({ _id: fileId });
    const fs = require('fs');
    const filePath = file.storagePath;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'File deleted successfully', fileId });
  } catch (err) {
    next(err);
  }
});
module.exports = router;