import { Router } from 'express';
import { upload } from '../middleware/fileUpload.js';

const router = new Router();

router.post('/', upload.single('avatar'), (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarPath = `/uploads/${req.file.filename}`;
    const fullAvatarUrl = `${baseUrl}${avatarPath}`;
    
    res.json({
      success: true,
      url: fullAvatarUrl
    });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ message: 'Upload error' });
  }
});

export default router;