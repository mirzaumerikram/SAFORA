/**
 * SAFORA — seed test accounts for all three roles
 * Run once:  node seedUsers.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

const USERS = [
    {
        name:     'SAFORA Admin',
        phone:    '+923000000001',
        email:    'admin@safora.pk',
        password: 'admin1234',
        role:     'admin',
        gender:   'other',
        verified: true,
    },
    {
        name:     'Test Passenger',
        phone:    '+923000000002',
        email:    'passenger@safora.pk',
        password: 'pass1234',
        role:     'passenger',
        gender:   'female',
        verified: true,
    },
    {
        name:     'Test Driver',
        phone:    '+923000000003',
        email:    'driver@safora.pk',
        password: 'pass1234',
        role:     'driver',
        gender:   'male',
        verified: true,
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Fix cnic index — drop old non-sparse unique index if it exists
        try {
            await mongoose.connection.collection('users').dropIndex('cnic_1');
            console.log('✅ Dropped old cnic index');
            // Recreate as sparse so multiple null CNICs are allowed
            await mongoose.connection.collection('users').createIndex(
                { cnic: 1 },
                { unique: true, sparse: true, background: true }
            );
            console.log('✅ Recreated cnic index as sparse\n');
        } catch (e) {
            // Index may already be correct or not exist — that's fine
        }

        for (const data of USERS) {
            // Remove any existing user with this phone or email to start clean
            await User.deleteOne({ $or: [{ phone: data.phone }, { email: data.email }] });

            const user = new User(data);
            await user.save();
            console.log(`✅ Created [${data.role.toUpperCase()}]  ${data.name}`);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  SAFORA TEST CREDENTIALS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('  🔴 ADMIN  (localhost:3001)');
        console.log('     Phone    : +923000000001');
        console.log('     OTP      : 12345  (dev)');
        console.log('     Email    : admin@safora.pk');
        console.log('     Password : admin1234');
        console.log('');
        console.log('  🟡 PASSENGER  (localhost:8082)');
        console.log('     Phone    : +923000000002');
        console.log('     OTP      : 12345  (dev)');
        console.log('     Email    : passenger@safora.pk');
        console.log('     Password : pass1234');
        console.log('');
        console.log('  🟢 DRIVER  (localhost:8082 → driver role)');
        console.log('     Phone    : +923000000003');
        console.log('     OTP      : 12345  (dev)');
        console.log('     Email    : driver@safora.pk');
        console.log('     Password : pass1234');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

seed();
