// hashgen.js
const bcrypt = require('bcrypt');

async function generate() {
    const hash = await bcrypt.hash('AdminPassword123!', 10);
    console.log('Your hash:', hash);
}

generate();