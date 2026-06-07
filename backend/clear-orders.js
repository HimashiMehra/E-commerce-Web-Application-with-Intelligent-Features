const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function clearOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!');

    // Clear Orders
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const result = await Order.deleteMany({});
    console.log(`🗑️  Successfully cleared ${result.deletedCount} stale orders from the database.`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear orders:', err.message);
    process.exit(1);
  }
}

clearOrders();
