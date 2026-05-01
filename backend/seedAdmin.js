const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

async function seedAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const ADMIN_PHONE = '+923231783922';
    const ADMIN_EMAIL = 'mirzaumerikram114@gmail.com';
    const ADMIN_PASSWORD = 'admin1234';

    // Find ALL users that match phone OR email (could be 2 separate records)
    const matches = await User.find({ $or: [{ phone: ADMIN_PHONE }, { email: ADMIN_EMAIL }] });
    console.log(`Found ${matches.length} matching record(s):`);
    matches.forEach(u => console.log(' -', u._id, '| phone:', u.phone, '| email:', u.email, '| role:', u.role));

    // Delete all of them — we'll create a single clean admin record
    if (matches.length > 0) {
        await User.deleteMany({ $or: [{ phone: ADMIN_PHONE }, { email: ADMIN_EMAIL }] });
        console.log('🗑  Removed old record(s)');
    }

    // Create the definitive admin account
    const user = new User({
        name:     'SAFORA Admin',
        phone:    ADMIN_PHONE,
        email:    ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role:     'admin',
        gender:   'other',
        verified: true,
    });
    await user.save();
    console.log('✅ Clean admin user created (id:', user._id, ')');

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ADMIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Phone  : +923231783922');
    console.log('  OTP    : 12345  (dev mode)');
    console.log('  Email  : mirzaumerikram114@gmail.com');
    console.log('  Pass   : admin1234');
    console.log('  Panel  : http://localhost:3001');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
}

seedAdmin().catch(err => { console.error(err); process.exit(1); });
