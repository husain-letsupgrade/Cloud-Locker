const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDB } = require('../db');

router.use(auth);

router.get('/sort', async (req, res, next) => {
  try {
    const db = getDB();
    const ownerId = req.user.id;

    const { type, by = 'name', order = 'asc' } = req.query;

    if (!type || !['file', 'folder'].includes(type)) {
      return res.status(400).json({ error: "type must be 'file' or 'folder'" });
    }

    const collection = type === 'file' ? 'files' : 'folders';

    const validFields = type === 'file'
      ? ['name', 'createdAt', 'updatedAt', 'size']
      : ['name', 'createdAt', 'updatedAt'];

    if (!validFields.includes(by)) {
      return res.status(400).json({ error: `Invalid sort field for ${type}` });
    }

    const sortOrder = order === 'desc' ? -1 : 1;

    const items = await db.collection(collection)
      .find({ ownerId })
      .sort({ [by]: sortOrder })
      .toArray();

    res.json({ type, sortedBy: by, order, results: items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
