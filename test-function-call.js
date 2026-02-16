const fetch = global.fetch || require('node-fetch');

async function testFunctionCall() {
    const projectId = 'shoso-photobook';
    const region = 'us-central1';
    const functionName = 'analyzePhotoPosition';

    // Local emulator URL
    const url = `http://127.0.0.1:5001/${projectId}/${region}/${functionName}`;

    console.log(`Calling function at: ${url}`);

    const payload = {
        data: {
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Portrait_of_a_young_man_in_a_park.jpg',
            width: 3456,
            height: 5184,
            layoutBox: {
                width: 800,
                height: 600
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const json = await response.json();

        if (json.error) {
            console.error('Function Error:', json.error);
        } else {
            console.log('Function Success!');
            console.log(JSON.stringify(json.result, null, 2));
        }

    } catch (err) {
        console.error('Request failed:', err);
    }
}

testFunctionCall();
