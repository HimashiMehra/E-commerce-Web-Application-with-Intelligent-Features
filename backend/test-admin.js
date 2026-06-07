const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/amazon-clone');
  console.log('Connected to MongoDB.');
  
  const admin = await User.findOne({ email: 'admin@amazon-clone.com' }).select('+password');
  if (!admin) {
    console.log('Admin user NOT found in DB!');
  } else {
    console.log('Admin user found:', admin.email);
    console.log('Role:', admin.role);
    console.log('Password hash in DB:', admin.password);
    
    const matchesAdmin123 = await bcrypt.compare('admin123', admin.password);
    console.log("Does it match 'admin123'?", matchesAdmin123);
    
    const matchesAdminCaps = await bcrypt.compare('Admin@123456', admin.password);
    console.log("Does it match 'Admin@123456'?", matchesAdminCaps);
  }
  process.exit(0);
}

test().catch(console.error);
