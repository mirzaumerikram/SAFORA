const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

async function seedAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const ADMIN_PHONE = '+923001234567';
    const ADMIN_EMAIL = 'admin@safora.pk';
    const ADMIN_PASSWORD = 'admin1234';

    let user = await User.findOne({ phone: ADMIN_PHONE });

    if (user) {
        user.name = 'SAFORA Admin';
        user.role = 'admin';
        user.verified = true;
        user.email = ADMIN_EMAIL;
        user.gender = 'other';
        user.password = ADMIN_PASSWORD;
        await user.save();
        console.log('✅ Existing user upgraded to admin');
    } else {
        user = new User({
            name: 'SAFORA Admin',
            phone: ADMIN_PHONE,
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role: 'admin',
            gender: 'other',
            verified: true,
        });
        await user.save();
        console.log('✅ Admin user created');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ADMIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Phone  : +923001234567');
    console.log('  OTP    : 12345  (dev mode)');
    console.log('  Email  : admin@safora.pk');
    console.log('  Pass   : admin1234');
    console.log('  Panel  : http://localhost:3001');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
}

seedAdmin().catch(err => { console.error(err); process.exit(1); });
