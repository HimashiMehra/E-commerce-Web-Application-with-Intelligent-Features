/**
 * Amazon Clone — Database Seeder
 * Run: node seed/seedProducts.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('../models/Product');
const User = require('../models/User');

// All prices in INR (₹)
const PRODUCTS = [
  {
    name: 'Apple AirPods Pro (2nd Gen) USB-C Charging Case',
    description: 'The Apple AirPods Pro (2nd generation) deliver next-level Active Noise Cancellation, along with Adaptive Transparency, and Personalized Spatial Audio with dynamic head tracking.',
    images: [
      'https://images.unsplash.com/photo-1631867675167-90a456a90863?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Apple', price: 15876, originalPrice: 20916,
    stock: 150, rating: 4.8, numReviews: 87432, featured: true, badge: 'Best Seller', prime: true,
    features: ['Active Noise Cancellation', 'Adaptive Transparency', 'Personalized Spatial Audio', 'MagSafe Charging Case', 'USB-C compatible'],
  },
  {
    name: 'Samsung 65-Inch OLED 4K Smart TV (S90C Series)',
    description: 'Experience breathtaking picture quality with the Samsung S90C OLED TV. Featuring Neural Quantum Processor 4K, Dolby Atmos, and Tizen Smart TV OS.',
    images: [
      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Samsung', price: 100631, originalPrice: 142799,
    stock: 30, rating: 4.7, numReviews: 12843, featured: true, badge: 'Deal', prime: true,
    features: ['4K OLED Panel', '144Hz Refresh Rate', 'Neural Quantum Processor', 'Dolby Atmos', 'Smart TV Tizen OS'],
  },
  {
    name: 'Logitech MX Master 3S Wireless Mouse',
    description: 'The MX Master 3S is the master of all mice — featuring an ultra-precise 8000 DPI sensor and near-silent clicks. Works on any surface.',
    images: [
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Logitech', price: 6299, originalPrice: 8399,
    stock: 200, rating: 4.7, numReviews: 45321, featured: true, badge: 'Best Seller', prime: true,
    features: ['8000 DPI Sensor', 'Electromagnetic MagSpeed Scroll', 'USB-C Rechargeable', 'Works on any surface', 'Multi-device'],
  },
  {
    name: 'Sony WH-1000XM5 Industry-Leading Noise Canceling Headphones',
    description: 'Sony WH-1000XM5 headphones with industry-leading noise cancellation, 30-hour battery life, and multipoint Bluetooth connection for unmatched listening.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Sony', price: 23352, originalPrice: 29399,
    stock: 75, rating: 4.6, numReviews: 32187, featured: false, badge: '', prime: true,
    features: ['Industry-leading noise cancellation', '30-hour battery', 'Multipoint connection', 'Crystal clear calls'],
  },
  {
    name: 'Apple MacBook Air 13-inch M3 Chip — 8GB RAM 256GB SSD',
    description: 'The Apple MacBook Air with the blazing-fast M3 chip. Thin, light, and faster than ever — with an 18-hour battery and stunning Liquid Retina display.',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Apple', price: 92316, originalPrice: 100716,
    stock: 60, rating: 4.8, numReviews: 9872, featured: true, badge: 'New Arrival', prime: true,
    features: ['Apple M3 chip', '18-hour battery', 'Liquid Retina display', 'Touch ID', '1080p FaceTime camera'],
  },
  {
    name: 'Kindle Paperwhite 16GB Signature Edition — 6.8" Display',
    description: 'The Kindle Paperwhite with a 6.8" glare-free display, auto-adjusting warm light, IPX8 waterproofing, and 16GB storage for your entire library.',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Amazon', price: 11759, originalPrice: 13439,
    stock: 400, rating: 4.7, numReviews: 54321, featured: true, badge: 'Best Seller', prime: true,
    features: ['6.8-inch display', 'Adjustable warm light', 'IPX8 waterproof', 'USB-C charging', 'Weeks of battery'],
  },
  {
    name: 'Atomic Habits: Build Good Habits & Break Bad Ones',
    description: 'James Clear, one of the world\'s leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits.',
    images: [
      'https://images.unsplash.com/photo-1535398089889-dd807df1dfaa?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Books', brand: 'Penguin', price: 1007, originalPrice: 2268,
    stock: 500, rating: 4.8, numReviews: 124532, featured: true, badge: 'Best Seller', prime: true,
    features: ['#1 NYT Bestseller', '15M+ copies sold', 'Practical strategies', 'Science-backed'],
  },
  {
    name: 'The Psychology of Money: Timeless Lessons on Wealth',
    description: 'Doing well with money has little to do with how smart you are. It\'s about how you behave. Morgan Housel offers 19 short stories exploring the strange ways people think about money.',
    images: [
      'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Books', brand: 'Harriman House', price: 1200, originalPrice: 1679,
    stock: 350, rating: 4.7, numReviews: 89432, featured: false, badge: '', prime: true,
    features: ['19 short stories', 'Timeless financial lessons', 'NYT Bestseller'],
  },
  {
    name: 'Fourth Wing — The Empyrean Book 1 (Hardcover)',
    description: 'Twenty-year-old Violet Sorrengail was supposed to enter the Scribe Quadrant, but the commanding general — her own mother — forces her into the riders quadrant.',
    images: [
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Books', brand: 'Red Tower Books', price: 1551, originalPrice: 2436,
    stock: 200, rating: 4.7, numReviews: 67543, featured: false, badge: 'Hot', prime: true,
    features: ['Fantasy romance', '#1 bestseller', '561 pages', 'Epic adventure'],
  },
  {
    name: "Levi's Men's 511 Slim Fit Jeans",
    description: "Levi's Men's 511 Slim Fit Jeans sit below the waist and are cut close through the thigh and leg opening. Available in multiple washes and colors.",
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Clothing', brand: "Levi's", price: 3359, originalPrice: 5879,
    stock: 300, rating: 4.5, numReviews: 23456, featured: false, badge: '', prime: true,
    features: ['Slim fit', 'Cotton blend', 'Machine washable', 'Multiple colors'],
  },
  {
    name: 'Amazon Essentials Women Classic-Fit Long-Sleeve T-Shirt',
    description: 'The Amazon Essentials classic-fit long-sleeve t-shirt made from soft 100% cotton. Everyday wear that is comfortable and versatile.',
    images: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Clothing', brand: 'Amazon Essentials', price: 1050, originalPrice: 1344,
    stock: 500, rating: 4.4, numReviews: 34521, featured: false, badge: '', prime: true,
    features: ['100% Cotton', 'Classic fit', 'Machine washable'],
  },
  {
    name: 'Nike Air Max 270 React Men Running Shoes',
    description: 'The Nike Air Max 270 React combines Nike\'s first lifestyle Air unit with React foam, delivering unmatched cushion and a modern aesthetic.',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Clothing', brand: 'Nike', price: 8396, originalPrice: 12600,
    stock: 120, rating: 4.6, numReviews: 18765, featured: true, badge: 'Deal', prime: true,
    features: ['Max Air unit', 'React foam midsole', 'Breathable mesh', 'Rubber outsole'],
  },
  {
    name: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker 6 Quart',
    description: 'The Instant Pot Duo 7-in-1 multi-cooker replaces 7 kitchen appliances. Cook up to 70% faster than conventional cooking. 14 smart programs.',
    images: [
      'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Home & Kitchen', brand: 'Instant Pot', price: 6716, originalPrice: 8399,
    stock: 250, rating: 4.7, numReviews: 156432, featured: true, badge: 'Best Seller', prime: true,
    features: ['7-in-1 multi-cooker', '6 quart capacity', '14 smart programs', 'Dishwasher safe'],
  },
  {
    name: 'Cuisinart 14-Cup Food Processor — Brushed Stainless Steel',
    description: 'The Cuisinart 14-Cup Food Processor is built to handle large recipe quantities. Its 720-watt motor powers through even the toughest chopping, slicing, and shredding tasks.',
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Home & Kitchen', brand: 'Cuisinart', price: 12596, originalPrice: 16799,
    stock: 80, rating: 4.6, numReviews: 32145, featured: false, badge: '', prime: true,
    features: ['14-cup work bowl', '720-watt motor', 'Dishwasher safe', 'Stainless blades'],
  },
  {
    name: 'Dyson V15 Detect Absolute Cordless Vacuum Cleaner',
    description: 'The Dyson V15 Detect reveals hidden dust with a laser and quantifies what you have removed with a piezo sensor. Powerful suction, 60-min runtime.',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Home & Kitchen', brand: 'Dyson', price: 50399, originalPrice: 62999,
    stock: 40, rating: 4.7, numReviews: 8932, featured: true, badge: 'Deal', prime: true,
    features: ['Laser dust detection', '60-min runtime', 'HEPA filtration', '9 attachments'],
  },
  {
    name: 'Bowflex SelectTech 552 Adjustable Dumbbells — Pair',
    description: 'Bowflex SelectTech 552 dumbbells replace 15 sets of weights in one, adjusting from 5 to 52.5 lbs with a simple dial. Perfect for any home gym.',
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Sports', brand: 'Bowflex', price: 29316, originalPrice: 46116,
    stock: 50, rating: 4.7, numReviews: 21543, featured: true, badge: 'Deal', prime: true,
    features: ['Replaces 15 dumbbells', '5 to 52.5 lbs', 'Space saving', 'Dial adjusts weight'],
  },
  {
    name: 'Hydro Flask 32oz Wide Mouth Bottle with Flex Cap',
    description: 'Hydro Flask wide mouth bottle keeps beverages cold for 24 hours and hot for 12 hours. TempShield double-wall vacuum insulation with lifetime warranty.',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Sports', brand: 'Hydro Flask', price: 2936, originalPrice: 4196,
    stock: 300, rating: 4.8, numReviews: 45678, featured: false, badge: 'Best Seller', prime: true,
    features: ['TempShield insulation', '18/8 stainless steel', 'BPA-free', 'Lifetime warranty'],
  },
  {
    name: 'CeraVe Moisturizing Cream 16oz — Body and Face Moisturizer',
    description: 'Developed with dermatologists, CeraVe Moisturizing Cream provides long-lasting hydration with ceramides and hyaluronic acid. Non-comedogenic and fragrance-free.',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Beauty', brand: 'CeraVe', price: 1257, originalPrice: 1679,
    stock: 600, rating: 4.8, numReviews: 98765, featured: true, badge: 'Best Seller', prime: true,
    features: ['24-hour moisturization', 'Ceramides & Hyaluronic Acid', 'Non-comedogenic', 'Fragrance free'],
  },
  {
    name: 'LANEIGE Lip Sleeping Mask Berry 0.7 oz',
    description: 'LANEIGE Lip Sleeping Mask intensely moisturizes lips overnight with Berry Mix Complex and Vitamin C for soft, nourished lips by morning.',
    images: [
      'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Beauty', brand: 'LANEIGE', price: 1176, originalPrice: 1848,
    stock: 400, rating: 4.6, numReviews: 54321, featured: false, badge: '', prime: true,
    features: ['Overnight lip treatment', 'Vitamin C & antioxidants', 'Berry scent'],
  },
  {
    name: 'LEGO Icons Botanical Collection Orchid Building Set 608 Pieces',
    description: 'Build and display a beautiful LEGO orchid! This stunning botanical set features 608 pieces and is perfect for adults looking for a creative building experience.',
    images: [
      'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Toys', brand: 'LEGO', price: 4199, originalPrice: 5039,
    stock: 100, rating: 4.8, numReviews: 32145, featured: false, badge: 'Best Seller', prime: true,
    features: ['608 pieces', 'Lifelike orchid model', 'For adults 18+', 'Great gift'],
  },
  {
    name: 'Chemical Guys Car Wash Kit Complete — 16-Piece Bundle',
    description: 'The Chemical Guys 16-piece car wash kit includes everything you need to keep your car clean and shining. Professional-grade formulas at consumer-friendly prices.',
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Automotive', brand: 'Chemical Guys', price: 6719, originalPrice: 10079,
    stock: 80, rating: 4.7, numReviews: 12543, featured: false, badge: 'Deal', prime: true,
    features: ['16-piece kit', 'Car wash soap', 'Microfiber towels', 'Wash mitt'],
  },
  {
    name: 'Anker 625 USB-C to USB-C Cable 6ft — 60W Charging',
    description: 'Anker 625 USB-C cable supports 60W fast charging and data transfer up to 480Mbps. Lifetime warranty. Works with any USB-C device.',
    images: [
      'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Anker', price: 923, originalPrice: 1511,
    stock: 500, rating: 4.7, numReviews: 45231, featured: false, badge: '', prime: true,
    features: ['60W fast charging', '6-foot nylon braided', 'Lifetime warranty'],
  },
  {
    name: 'Ninja AF101 Air Fryer 4 Quart — Crispy Every Time',
    description: 'The Ninja Air Fryer uses Super-heated air circulation to create perfect crispiness, up to 75% less fat than traditional frying. 4-quart capacity.',
    images: [
      'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Home & Kitchen', brand: 'Ninja', price: 6719, originalPrice: 8399,
    stock: 180, rating: 4.7, numReviews: 43210, featured: true, badge: 'Best Seller', prime: true,
    features: ['4-quart capacity', 'Up to 75% less fat', 'Wide temperature range', 'Dishwasher safe basket'],
  },
  {
    name: 'SAMSUNG Galaxy Watch 6 Classic Smartwatch 47mm LTE',
    description: 'Galaxy Watch 6 Classic with rotating bezel, BioActive Sensor for advanced health monitoring, sleep tracking, and long-lasting battery in 47mm case.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=80',
    ],
    category: 'Electronics', brand: 'Samsung', price: 19319, originalPrice: 33599,
    stock: 60, rating: 4.5, numReviews: 8765, featured: true, badge: 'Deal', prime: true,
    features: ['BioActive Sensor', 'LTE connectivity', 'Sleep Tracking', 'IP68 water resistant'],
  },
];

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!\n');

    // Clear existing
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products.');

    // Insert products
    const created = await Product.insertMany(PRODUCTS);
    console.log(`✅ Seeded ${created.length} products.\n`);

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@amazon-clone.com';
    const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@123456';

    await User.deleteOne({ email: adminEmail });
    const admin = await User.create({
      name:     'Admin User',
      email:    adminEmail,
      password: adminPass,
      role:     'admin',
    });
    console.log(`👑 Admin user created: ${admin.email}`);
    console.log(`🔑 Password: ${adminPass}\n`);

    // Create a demo user
    await User.deleteOne({ email: 'demo@amazon-clone.com' });
    await User.create({
      name:     'Demo Customer',
      email:    'demo@amazon-clone.com',
      password: 'Demo@123456',
      role:     'user',
    });
    console.log('👤 Demo user created: demo@amazon-clone.com / Demo@123456\n');

    console.log('🚀 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
