

async function testBackend() {
    const payload = {
        prompt: "Vintage layout",
        photos: [
            { id: "p1", index: 0, date: "2024-01-01" },
            { id: "p2", index: 1, date: "2024-01-02" }
        ],
        options: { lang: "en" }
    };

    try {
        const res = await fetch('https://us-central1-shoso-photobook.cloudfunctions.net/magic/create', { // Use production URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.log("Error status:", res.status);
            console.log(await res.text());
            return;
        }
        const data = await res.json();
        console.log(JSON.stringify(data.pages[0], null, 2));
        console.log(JSON.stringify(data.pages[1], null, 2));
    } catch (err) {
        console.error(err);
    }
}

testBackend();
