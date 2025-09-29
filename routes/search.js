const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDB } = require('../db');

router.use(auth);

router.get('/search', async (req, res, next) => {
  try {
    const db = getDB();
    const ownerId = req.user.id;
    const q = req.query.q;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const regex = new RegExp(q, 'i');

    const files = await db.collection('files').find({
      ownerId,
      $or: [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { tags: { $in: [regex] } }
      ]
    }).toArray();

    const folders = await db.collection('folders').find({
      ownerId,
      $or: [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { tags: { $in: [regex] } }
      ]
    }).toArray();

    res.json({ query: q, files, folders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;