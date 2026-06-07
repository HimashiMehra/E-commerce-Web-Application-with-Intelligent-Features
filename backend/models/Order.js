const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:     { type: String, required: true },
    image:    { type: String, required: true },
    price:    { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    street:   { type: String, required: true },
    city:     { type: String, required: true },
    state:    { type: String, required: true },
    pincode:  { type: String, required: true },
    phone:    { type: String, required: true },
    country:  { type: String, default: 'India' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems:      [orderItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: {
      type: String,
      enum: ['stripe', 'cod', 'upi', 'card', 'netbanking', 'wallet'],
      default: 'stripe',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'refund_pending'],
      default: 'pending',
    },
    isPaid:    { type: Boolean, default: false },
    paidAt:    { type: Date },

    orderStatus: {
      type: String,
      enum: ['processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'processing',
    },
    deliveredAt: { type: Date },

    // Pricing
    itemsPrice:    { type: Number, required: true, default: 0 },
    shippingPrice: { type: Number, required: true, default: 0 },
    taxPrice:      { type: Number, required: true, default: 0 },
    totalPrice:    { type: Number, required: true, default: 0 },

    // Stripe
    stripeSessionId:      { type: String },
    stripePaymentIntentId: { type: String },

    // Tracking
    trackingNumber: { type: String, default: '' },
    notes:          { type: String, default: '' },
  },
  { timestamps: true }
);

// Generate human-readable order number
orderSchema.virtual('orderNumber').get(function () {
  return `AMZ-${this._id.toString().slice(-8).toUpperCase()}`;
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
