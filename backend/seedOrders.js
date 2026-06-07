const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');

dotenv.config({ path: path.join(__dirname, '.env') });

async function seedOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!');

    // Clear existing orders
    await Order.deleteMany({});
    console.log('🗑️  Cleared existing orders.');

    // Find demo user
    const demoUser = await User.findOne({ email: 'demo@amazon-clone.com' });
    if (!demoUser) {
      console.log('❌ Demo user not found! Run npm run seed first.');
      process.exit(1);
    }

    // Find some products
    const products = await Product.find({});
    if (products.length < 5) {
      console.log('❌ Less than 5 products found! Run npm run seed first.');
      process.exit(1);
    }

    // Map products by name for easy selection
    const findProduct = (nameQuery) => products.find(p => p.name.includes(nameQuery));

    const airpods = findProduct('AirPods');
    const tv = findProduct('TV');
    const mouse = findProduct('Logitech');
    const kindle = findProduct('Kindle');
    const habits = findProduct('Atomic Habits');
    const moneyBook = findProduct('Money');
    const jeans = findProduct('Slim Fit');
    const shoes = findProduct('Nike');

    const dummyAddress = {
      fullName: 'Som Kumar',
      street: 'Flat 402, Sunrise Apartments, Sector 15',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      phone: '9876543210',
      country: 'India'
    };

    const ordersToSeed = [
      // 1. AirPods Order (Stripe, Paid, Processing)
      {
        user: demoUser._id,
        orderItems: [
          {
            product: airpods._id,
            name: airpods.name,
            image: airpods.images[0],
            price: airpods.price,
            quantity: 2
          }
        ],
        shippingAddress: dummyAddress,
        paymentMethod: 'stripe',
        paymentStatus: 'paid',
        isPaid: true,
        paidAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
        orderStatus: 'processing',
        itemsPrice: airpods.price * 2,
        shippingPrice: 0,
        taxPrice: Math.round((airpods.price * 2 * 0.18) * 100) / 100,
        totalPrice: Math.round((airpods.price * 2 * 1.18) * 100) / 100
      },
      // 2. Kindle Order (Netbanking, Paid, Delivered)
      {
        user: demoUser._id,
        orderItems: [
          {
            product: kindle._id,
            name: kindle.name,
            image: kindle.images[0],
            price: kindle.price,
            quantity: 1
          }
        ],
        shippingAddress: dummyAddress,
        paymentMethod: 'netbanking',
        paymentStatus: 'paid',
        isPaid: true,
        paidAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
        orderStatus: 'delivered',
        deliveredAt: new Date(Date.now() - 3600000 * 4),
        itemsPrice: kindle.price,
        shippingPrice: 0,
        taxPrice: Math.round((kindle.price * 0.18) * 100) / 100,
        totalPrice: Math.round((kindle.price * 1.18) * 100) / 100
      },
      // 3. Books & Jeans Order (UPI, Paid, Confirmed)
      {
        user: demoUser._id,
        orderItems: [
          {
            product: habits._id,
            name: habits.name,
            image: habits.images[0],
            price: habits.price,
            quantity: 1
          },
          {
            product: jeans._id,
            name: jeans.name,
            image: jeans.images[0],
            price: jeans.price,
            quantity: 1
          }
        ],
        shippingAddress: dummyAddress,
        paymentMethod: 'upi',
        paymentStatus: 'paid',
        isPaid: true,
        paidAt: new Date(Date.now() - 3600000 * 12), // 12 hours ago
        orderStatus: 'confirmed',
        itemsPrice: habits.price + jeans.price,
        shippingPrice: 0,
        taxPrice: Math.round(((habits.price + jeans.price) * 0.18) * 100) / 100,
        totalPrice: Math.round(((habits.price + jeans.price) * 1.18) * 100) / 100
      },
      // 4. Mouse Order (COD, Pending, Confirmed)
      {
        user: demoUser._id,
        orderItems: [
          {
            product: mouse._id,
            name: mouse.name,
            image: mouse.images[0],
            price: mouse.price,
            quantity: 1
          }
        ],
        shippingAddress: dummyAddress,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        isPaid: false,
        orderStatus: 'confirmed',
        itemsPrice: mouse.price,
        shippingPrice: 0,
        taxPrice: Math.round((mouse.price * 0.18) * 100) / 100,
        totalPrice: Math.round((mouse.price * 1.18) * 100) / 100
      },
      // 5. Nike Shoes Order (Card, Paid, Shipped)
      {
        user: demoUser._id,
        orderItems: [
          {
            product: shoes._id,
            name: shoes.name,
            image: shoes.images[0],
            price: shoes.price,
            quantity: 1
          }
        ],
        shippingAddress: dummyAddress,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        isPaid: true,
        paidAt: new Date(Date.now() - 3600000 * 36), // 36 hours ago
        orderStatus: 'shipped',
        itemsPrice: shoes.price,
        shippingPrice: 0,
        taxPrice: Math.round((shoes.price * 0.18) * 100) / 100,
        totalPrice: Math.round((shoes.price * 1.18) * 100) / 100
      }
    ];

    const seeded = await Order.insertMany(ordersToSeed);
    console.log(`✅ Seeded ${seeded.length} mock orders successfully!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed orders:', err.message);
    process.exit(1);
  }
}

seedOrders();
