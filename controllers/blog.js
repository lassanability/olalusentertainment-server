const Blog = require('../models/blog');
const storage = require('../config/storage');
const Subscriber = require('../models/subscriber');
const { sendNewsletterEmails } = require('../helpers/email');

const getImageUrl = (key) => {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
};

const uploadFiles = async (files) => {
  const urls = [];
  for (const file of files) {
    const key = `blog/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname.replace(/\s+/g, '-')}`;
    await storage.uploadFile(file.buffer, key, file.mimetype);
    urls.push(getImageUrl(key));
  }
  return urls;
};

exports.getAll = async (req, res) => {
  try {
    const { category, tag, search } = req.query;
    const filter = { published: true };

    if (category) filter.category = { $regex: category, $options: 'i' };
    if (tag) filter.tags = { $in: [tag] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const blogs = await Blog.find(filter).sort({ publishedAt: -1, createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const blogs = await Blog.find({ featured: true, published: true }).sort({ publishedAt: -1 }).limit(6);
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Blog.distinct('category', { published: true });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTags = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true }, 'tags');
    const tags = [...new Set(blogs.flatMap(b => b.tags))];
    res.json({ success: true, tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByAuthor = async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.params.authorId, published: true }).sort({ publishedAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, content, category, author, featured, published, publishedAt, tags, isIndexed, permanentPlacement, homepageVisibilityDays, doFollowLinks } = req.body;

    const imageUrls = req.files && req.files.length > 0 ? await uploadFiles(req.files) : [];

    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags || [];
    const parsedDoFollow = typeof doFollowLinks === 'string' ? JSON.parse(doFollowLinks) : doFollowLinks;

    const blog = await Blog.create({
      title, content,
      image: imageUrls[0] || '',
      images: imageUrls,
      category, author,
      featured: featured === 'true' || featured === true,
      published: published !== 'false' && published !== false,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      tags: parsedTags,
      isIndexed: isIndexed !== 'false' && isIndexed !== false,
      permanentPlacement: permanentPlacement === 'true' || permanentPlacement === true,
      homepageVisibilityDays: Number(homepageVisibilityDays) || 0,
      doFollowLinks: parsedDoFollow,
    });

    if (blog.published) {
      Subscriber.find().then(subscribers => {
        if (subscribers.length === 0) return;
        const emails = subscribers.map(s => s.email);
        const subject = `New Post: ${blog.title}`;
        const message = `We just published a new ${blog.category || 'entertainment'} article: "${blog.title}".\n\nVisit our website to read the full post and stay up to date with the latest from Olalus Entertainment.`;
        sendNewsletterEmails(emails, subject, message).catch(err =>
          console.error('[email] blog newsletter error:', err.message)
        );
      }).catch(err => console.error('[newsletter] subscriber fetch error:', err.message));
    }

    res.status(201).json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const { title, content, category, author, featured, published, publishedAt, tags, isIndexed, permanentPlacement, homepageVisibilityDays, doFollowLinks } = req.body;

    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (category !== undefined) blog.category = category;
    if (author !== undefined) blog.author = author;
    if (featured !== undefined) blog.featured = featured === 'true' || featured === true;
    if (published !== undefined) blog.published = published === 'true' || published === true;
    if (publishedAt !== undefined) blog.publishedAt = new Date(publishedAt);
    if (isIndexed !== undefined) blog.isIndexed = isIndexed === 'true' || isIndexed === true;
    if (permanentPlacement !== undefined) blog.permanentPlacement = permanentPlacement === 'true' || permanentPlacement === true;
    if (homepageVisibilityDays !== undefined) blog.homepageVisibilityDays = Number(homepageVisibilityDays);
    if (tags !== undefined) blog.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    if (doFollowLinks !== undefined) blog.doFollowLinks = typeof doFollowLinks === 'string' ? JSON.parse(doFollowLinks) : doFollowLinks;

    if (req.files && req.files.length > 0) {
      const newUrls = await uploadFiles(req.files);
      blog.image = newUrls[0];
      blog.images = newUrls;
    }

    await blog.save();
    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const force = req.query.force === 'true';
    if (blog.permanentPlacement && !force) {
      return res.status(400).json({ success: false, message: 'This blog has permanent placement. Use force=true to delete.' });
    }

    await blog.deleteOne();
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleFeatured = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    blog.featured = !blog.featured;
    await blog.save();
    res.json({ success: true, featured: blog.featured, message: `Blog ${blog.featured ? 'featured' : 'unfeatured'} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
