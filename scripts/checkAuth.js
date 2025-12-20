
const BASE_URL = 'http://localhost:5000';

async function runTests() {
    console.log('Starting Authentication Verification...');

    // 1. Health Check
    try {
        const res = await fetch(`${BASE_URL}/health`);
        console.log(`1. Health Check: ${res.status === 200 ? 'PASS' : 'FAIL'} (${res.status})`);
    } catch (e) {
        console.log('1. Health Check: FAIL (Server might be down)');
        console.log('   Please start the server with: npm start');
        process.exit(1);
    }

    // 2. Public Read Access (GET /api/programs)
    try {
        const res = await fetch(`${BASE_URL}/api/programs`);
        console.log(`2. Public Access (GET /programs): ${res.status === 200 ? 'PASS' : 'FAIL'} (${res.status})`);
    } catch (e) {
        console.log('2. Public Access: FAIL', e.message);
    }

    // 3. Unauthorized Write Access (POST /api/programs)
    try {
        const res = await fetch(`${BASE_URL}/api/programs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Test' })
        });
        console.log(`3. Unauthorized Write (POST /programs): ${res.status === 401 ? 'PASS' : 'FAIL'} (${res.status})`);
    } catch (e) {
        console.log('3. Unauthorized Write: FAIL', e.message);
    }

    // 4. Login
    let token;
    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'praghav77k@gmail.com',
                password: 'Raghav@555'
            })
        });
        const data = await res.json();
        if (res.status === 200 && data.token) {
            token = data.token;
            console.log('4. Login: PASS');
        } else {
            console.log(`4. Login: FAIL (${res.status})`, data);
        }
    } catch (e) {
        console.log('4. Login: FAIL', e.message);
    }

    // 5. Authorized Write Access (POST /api/programs)
    // We expect 400 Bad Request (validation error) but NOT 401 Unauthorized
    if (token) {
        try {
            const res = await fetch(`${BASE_URL}/api/programs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: 'Test' }) // Incomplete data
            });
            // 400 means validaion failed => Auth passed!
            // 201 means created
            // 401 means auth failed
            if (res.status === 400 || res.status === 201) {
                console.log(`5. Authorized Write (POST /programs): PASS (Status: ${res.status} - Access Granted)`);
            } else {
                console.log(`5. Authorized Write: FAIL (Status: ${res.status})`);
            }
        } catch (e) {
            console.log('5. Authorized Write: FAIL', e.message);
        }
    } else {
        console.log('5. Authorized Write: SKIPPED (No token)');
    }
}

runTests();
