const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const auth = require('../middleware/auth');
const { getDB } = require('../db');

router.use(auth);

router.post('/', async (req, res, next) => {
  try {
    const { name, parentFolderId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Folder name required' });

    const db = getDB();
    const ownerId = req.user.id;

    const parentId = parentFolderId ? parentFolderId : "root";

    if (parentId !== "root") {
      const parent = await db.collection('folders').findOne({ _id: parentId, ownerId });
      if (!parent) return res.status(404).json({ error: 'Parent folder not found' });
    }

    const folder = {
      _id: nanoid(),
      name: name.trim(),
      parentFolderId: parentId,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      starred: false,
      tags: [],
      description: ''
    };

    await db.collection('folders').insertOne(folder);
    res.status(201).json({ message: 'Folder created', folder });
  } catch (err) {
    next(err);
  }
});

router.get('/root', async (req, res, next) => {
  try {
    const db = getDB();
    const ownerId = req.user.id;

    const roots = await db.collection('folders')
      .find({ parentFolderId: "root", ownerId })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({ folder: null, subfolders: roots });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const ownerId = req.user.id;

    const folder = await db.collection('folders').findOne({ _id: id });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.ownerId !== ownerId) return res.status(403).json({ error: 'Access denied' });

    const subfolders = await db.collection('folders')
      .find({ parentFolderId: folder._id, ownerId })
      .sort({ createdAt: 1 })
      .toArray();

    const files = await db.collection('files')
      .find({ folderId: folder._id, ownerId })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({ folder, subfolders, files });
  } catch (err) {
    next(err);
  }
});
router.patch('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const ownerId = req.user.id;
    const folderId = req.params.id;
    const { name, description, tags, starred } = req.body;

    const folder = await db.collection('folders').findOne({ _id: folderId });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.ownerId !== ownerId) return res.status(403).json({ error: 'Access denied' });

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (description !== undefined) updatedFields.description = description;
    if (tags) updatedFields.tags = Array.isArray(tags) ? tags : tags.split(',');
    if (starred !== undefined) updatedFields.starred = starred;
    updatedFields.updatedAt = new Date();

    await db.collection('folders').updateOne({ _id: folderId }, { $set: updatedFields });

    const updatedFolder = await db.collection('folders').findOne({ _id: folderId });

    res.json({ message: 'Folder updated successfully', folder: updatedFolder });
  } catch (err) {
    next(err);
  }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const ownerId = req.user.id;
    const fs = require('fs');
    const path = require('path');

    const folder = await db.collection('folders').findOne({ _id: id, ownerId });
    if (!folder) return res.status(404).json({ error: 'Folder not found or access denied' });
    const deleteFolderRecursively = async (folderId) => {
      const files = await db.collection('files').find({ folderId, ownerId }).toArray();
      for (const file of files) {
        if (fs.existsSync(file.storagePath)) {
          fs.unlinkSync(file.storagePath);
        }
      }
      await db.collection('files').deleteMany({ folderId, ownerId });

      const subfolders = await db.collection('folders').find({ parentFolderId: folderId, ownerId }).toArray();
      for (const sub of subfolders) {
        await deleteFolderRecursively(sub._id);
      }

      await db.collection('folders').deleteOne({ _id: folderId, ownerId });
    };

    await deleteFolderRecursively(id);

    res.json({ message: 'Folder and all its contents deleted successfully', folderId: id });
  } catch (err) {
    next(err);
  }
});
   

module.exports = router;