const https = require('https');
const http = require('http');
const EventAlbum = require('../models/EventAlbum');
const seaweed = require('../config/storage');

exports.getAll = async (req, res) => {
  try {
    const photos = await EventAlbum.find().sort({ createdAt: -1 });
    res.json({ success: true, photos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { description, eventName } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Image is required' });
    if (!eventName?.trim()) return res.status(400).json({ success: false, message: 'Event name is required' });

    const ext = req.file.originalname.split('.').pop();
    const key = `album/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await seaweed.uploadFile(req.file.buffer, key, req.file.mimetype);
    const imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;

    const photo = await EventAlbum.create({
      imageUrl,
      description: description?.trim() || '',
      eventName: eventName.trim(),
    });

    res.status(201).json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBulk = async (req, res) => {
  try {
    const { description, eventName } = req.body;
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'At least one image is required' });
    if (!eventName?.trim()) return res.status(400).json({ success: false, message: 'Event name is required' });

    const photos = await Promise.all(
      req.files.map(async (file) => {
        const ext = file.originalname.split('.').pop();
        const key = `album/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        await seaweed.uploadFile(file.buffer, key, file.mimetype);
        const imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
        return EventAlbum.create({
          imageUrl,
          description: description?.trim() || '',
          eventName: eventName.trim(),
        });
      })
    );

    res.status(201).json({ success: true, photos, count: photos.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function fetchBuffer(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchBuffer(response.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      const chunks = [];
      response.on('data', (c) => chunks.push(c));
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: response.headers['content-type'] || '' }));
      response.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

exports.importFromGoogle = async (req, res) => {
  try {
    const { googleUrl, eventName, description } = req.body;
    if (!googleUrl?.trim()) return res.status(400).json({ success: false, message: 'Google Photos URL is required' });
    if (!eventName?.trim()) return res.status(400).json({ success: false, message: 'Event name is required' });
    if (!googleUrl.includes('photos.google.com')) return res.status(400).json({ success: false, message: 'Please provide a valid Google Photos album URL' });

    const { buffer: htmlBuf } = await fetchBuffer(googleUrl, 15000);
    const html = htmlBuf.toString('utf8');

    const seen = new Set();
    const imageUrls = [];
    const regex = /"(https:\/\/lh3\.googleusercontent\.com\/[^"]{20,})"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const base = match[1].split('=')[0];
      if (!seen.has(base)) {
        seen.add(base);
        imageUrls.push(`${base}=w2048`);
      }
    }

    if (imageUrls.length === 0) {
      return res.status(422).json({ success: false, message: 'No images found. Make sure the album is set to public/shared and the link is correct.' });
    }

    const limited = imageUrls.slice(0, 50);
    const photos = [];

    for (let i = 0; i < limited.length; i += 5) {
      const batch = limited.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (imgUrl) => {
          const { buffer, contentType } = await fetchBuffer(imgUrl, 15000);
          const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
          const mime = contentType.split(';')[0] || 'image/jpeg';
          const key = `album/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          await seaweed.uploadFile(buffer, key, mime);
          const imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
          return EventAlbum.create({
            imageUrl,
            description: description?.trim() || '',
            eventName: eventName.trim(),
          });
        })
      );
      results.forEach((r) => { if (r.status === 'fulfilled') photos.push(r.value); });
    }

    if (photos.length === 0) {
      return res.status(422).json({ success: false, message: 'Could not download images. Ensure the album is public and accessible.' });
    }

    res.status(201).json({ success: true, photos, count: photos.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const photo = await EventAlbum.findById(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    const { description, eventName } = req.body;
    if (description !== undefined) photo.description = description.trim();
    if (eventName !== undefined) photo.eventName = eventName.trim();

    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const key = `album/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await seaweed.uploadFile(req.file.buffer, key, req.file.mimetype);
      photo.imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
    }

    await photo.save();
    res.json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.likePhoto = async (req, res) => {
  try {
    const { action } = req.body;
    const photo = await EventAlbum.findById(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    photo.likes = Math.max(0, photo.likes + (action === 'unlike' ? -1 : 1));
    await photo.save();
    res.json({ success: true, likes: photo.likes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const photo = await EventAlbum.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
