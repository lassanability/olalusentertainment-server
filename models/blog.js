const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  image: { type: String },
  images: [{ type: String }],
  category: { type: String, default: 'general', trim: true },
  author: { type: String, trim: true },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now },
  tags: [{ type: String }],
  readTime: { type: String },
  isIndexed: { type: Boolean, default: true },
  permanentPlacement: { type: Boolean, default: false },
  homepageVisibilityDays: { type: Number, default: 0, min: 0, max: 15 },
  doFollowLinks: {
    clientLink: { type: String },
    internalLink: { type: String },
    authorityLinks: [{ type: String }],
  },
}, { timestamps: true });

blogSchema.pre('save', function (next) {
  if (this.content) {
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(wordCount / 200);
    this.readTime = `${minutes} min read`;
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
