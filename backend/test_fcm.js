require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');

async function testFCM() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Initialize Firebase
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    
    const User = require('./models/User');
    const users = await User.find({ fcmToken: { $exists: true, $ne: null, $ne: '' } });
    console.log('Found users with tokens:', users.length);
    
    if (users.length > 0) {
      // Find the most recently updated user
      const sortedUsers = users.sort((a, b) => b.updatedAt - a.updatedAt);
      const targetToken = sortedUsers[0].fcmToken;
      console.log('Sending test push to token:', targetToken.slice(0, 20) + '...');
      
      const message = {
        token: targetToken,
        notification: { title: 'Test Push', body: 'This is a test notification from SAFORA' },
        data: { test: 'true' },
        webpush: { headers: { Urgency: 'high' } }
      };
      
      const res = await admin.messaging().send(message);
      console.log('Success! Message ID:', res);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

testFCM();
