require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ fcmToken: { $exists: true, $ne: null, $ne: '' } }).select('name phone fcmToken updatedAt role');
    console.log(`Found ${users.length} users with FCM tokens.`);
    users.forEach(u => {
        console.log(`User: ${u.name || u.phone} | Role: ${u.role} | Token: ${u.fcmToken.slice(0, 15)}... | Updated: ${u.updatedAt}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkTokens();
