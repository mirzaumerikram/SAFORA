const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './Backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./Backend/models/User');
  const Driver = require('./Backend/models/Driver');
  
  const user = await User.findOne({ email: 'mirzaumerikram114@gmail.com' });
  console.log('User FCM:', user ? user.fcmToken : 'not found');
  
  const driver = await Driver.findOne({ user: user ? user._id : null });
  console.log('Driver FCM:', driver ? driver.fcmToken : 'not found');
  
  process.exit(0);
}
run();
