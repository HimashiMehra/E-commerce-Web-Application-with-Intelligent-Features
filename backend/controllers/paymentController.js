const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Cart  = require('../models/Cart');

const USD_TO_INR = 84; // Conversion rate

// @desc    Create Stripe Checkout Session
// @route   POST /api/payment/create-checkout-session
// @access  Private
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized.');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid.');
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5500';

  // Build Stripe line items (prices are in INR, stripe wants paise = INR * 100)
  const lineItems = order.orderItems.map((item) => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: item.name,
        images: [item.image],
      },
      unit_amount: Math.round(item.price * 100), // price is already in INR
    },
    quantity: item.quantity,
  }));

  // Add shipping if applicable
  if (order.shippingPrice > 0) {
    lineItems.push({
      price_data: {
        currency: 'inr',
        product_data: { name: 'Shipping & Handling' },
        unit_amount: Math.round(order.shippingPrice * 100),
      },
      quantity: 1,
    });
  }

  // Add GST
  if (order.taxPrice > 0) {
    lineItems.push({
      price_data: {
        currency: 'inr',
        product_data: { name: 'GST (18%)' },
        unit_amount: Math.round(order.taxPrice * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    success_url: `${clientUrl}/checkout.html?success=true&orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${clientUrl}/checkout.html?cancelled=true&orderId=${orderId}`,
    metadata: {
      orderId:    orderId.toString(),
      userId:     req.user._id.toString(),
      orderTotal: order.totalPrice.toString(),
    },
    customer_email: req.user.email,
  });

  // Save session ID to order
  order.stripeSessionId = session.id;
  await order.save();

  res.json({
    success: true,
    sessionId:  session.id,
    sessionUrl: session.url,
  });
});

// @desc    Handle Stripe Webhook
// @route   POST /api/payment/webhook
// @access  Public (raw body, Stripe signed)
const handleWebhook = async (req, res) => {
  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Stripe event received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await handlePaymentSuccess(session);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        console.error('❌ Payment failed:', pi.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Error handling webhook event:', err.message);
    return res.status(500).send('Webhook handler error');
  }

  res.json({ received: true });
};

// Helper: mark order as paid + clear cart
const handlePaymentSuccess = async (session) => {
  const { orderId, userId } = session.metadata;

  const order = await Order.findById(orderId);
  if (!order) {
    console.error(`Order ${orderId} not found in webhook`);
    return;
  }

  if (!order.isPaid) {
    order.isPaid                = true;
    order.paidAt                = Date.now();
    order.paymentStatus         = 'paid';
    order.orderStatus           = 'confirmed';
    order.stripePaymentIntentId = session.payment_intent;
    await order.save();
    console.log(`✅ Order ${orderId} marked as PAID`);
  }

  // Clear the user's cart
  await Cart.findOneAndUpdate({ user: userId }, { items: [], totalPrice: 0, totalItems: 0 });
  console.log(`🛒 Cart cleared for user ${userId}`);
};

module.exports = { createCheckoutSession, handleWebhook };
