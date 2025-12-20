
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('Starting Programs CRUD Verification...');

    let token;
    let programId;

    // 1. Login
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'praghav77k@gmail.com',
                password: 'Raghav@555'
            })
        });
        const data = await res.json();
        if (data.success) {
            token = data.token;
            console.log('1. Login: PASS');
        } else {
            console.log('1. Login: FAIL', data);
            process.exit(1);
        }
    } catch (e) {
        console.log('1. Login: ERROR', e.message);
        process.exit(1);
    }

    // 2. Create Program (POST)
    try {
        const res = await fetch(`${BASE_URL}/programs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Program',
                summary: 'A test summary',
                category: 'Development',
                level: 'Beginner',
                duration: '1 month'
            })
        });
        const data = await res.json();
        if (data.success) {
            programId = data.data._id;
            console.log('2. Create Program: PASS');
        } else {
            console.log('2. Create Program: FAIL', data);
        }
    } catch (e) {
        console.log('2. Create Program: ERROR', e.message);
    }

    // 3. Update Program (PUT)
    if (programId) {
        try {
            const res = await fetch(`${BASE_URL}/programs/${programId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: 'Updated Test Program',
                    duration: '2 months'
                })
            });
            const data = await res.json();
            if (data.success && data.data.title === 'Updated Test Program') {
                console.log('3. Update Program: PASS');
            } else {
                console.log('3. Update Program: FAIL', data);
            }
        } catch (e) {
            console.log('3. Update Program: ERROR', e.message);
        }

        // 4. Delete Program (DELETE)
        try {
            const res = await fetch(`${BASE_URL}/programs/${programId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                console.log('4. Delete Program: PASS');
            } else {
                console.log('4. Delete Program: FAIL', data);
            }
        } catch (e) {
            console.log('4. Delete Program: ERROR', e.message);
        }
    } else {
        console.log('SKIPPING Update/Delete tests due to creation failure');
    }
}

runTests();
