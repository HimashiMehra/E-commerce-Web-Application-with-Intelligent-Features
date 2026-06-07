const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:     { type: String, required: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    title:    { type: String, default: '' },
    comment:  { type: String, required: true },
    helpful:  { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [300, 'Product name too long'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [5000, 'Description too long'],
    },
    images: {
      type: [String],
      required: [true, 'At least one image is required'],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'At least one image is required',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Electronics',
        'Books',
        'Clothing',
        'Home & Kitchen',
        'Sports',
        'Beauty',
        'Toys',
        'Automotive',
        'Other',
      ],
    },
    brand: { type: String, default: '' },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: { type: Number, default: null },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: { type: Number, default: 0 },
    reviews: [reviewSchema],
    featured: { type: Boolean, default: false },
    badge: {
      type: String,
      enum: ['Best Seller', 'Deal', 'New Arrival', 'Hot', 'Prime Exclusive', ''],
      default: '',
    },
    prime: { type: Boolean, default: true },
    features: [{ type: String }],
    slug: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round((1 - this.price / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual: in stock boolean
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// Text index for full-text search
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

// Recalculate rating after review changes
productSchema.methods.recalcRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.rating = parseFloat((sum / this.reviews.length).toFixed(1));
    this.numReviews = this.reviews.length;
  }
};

module.exports = mongoose.model('Product', productSchema);
