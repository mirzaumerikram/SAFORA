const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

async function inspect() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const drivers = await Driver.find().populate('user');
    console.log(`Found ${drivers.length} drivers`);

    drivers.forEach(d => {
        console.log('--- Driver ---');
        console.log('ID:', d._id);
        console.log('CNIC:', d.cnic);
        console.log('User Link (ID):', d.user?._id);
        console.log('User Name:', d.user?.name);
        console.log('User Phone:', d.user?.phone);
        console.log('Vehicle:', d.vehicleInfo?.make, d.vehicleInfo?.model);
    });

    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
