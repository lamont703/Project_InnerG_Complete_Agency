const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4"
const locationId = "QLyYYRoOhCg65lKW9HDX"

const endpoints = [
    { url: "/communities/groups" },
    { url: "/communities/v1/groups" },
    { url: "/communities/groups", version: "2021-04-15" },
    { url: "/communities/groups", version: "2021-07-28" },
    { url: "/communities/v1/groups", version: "2021-07-28" }
]

async function run() {
    console.log("--- Comprehensive GHL Community Discovery ---")
    
    for (const ep of endpoints) {
        const headers = {
            "Authorization": `Bearer ${ghlApiKey}`,
            "Accept": "application/json"
        }
        if (ep.version) headers["Version"] = ep.version

        console.log(`\nEndpoint: ${ep.url} | Version: ${ep.version || "None"}`)
        try {
            const res = await fetch(`https://services.leadconnectorhq.com${ep.url}?locationId=${locationId}`, { headers })
            console.log(`  Status: ${res.status} ${res.statusText}`)
            const text = await res.text()
            if (res.ok) {
                console.log(`  SUCCESS! Body Snippet:`, text.substring(0, 200))
            } else {
                console.log(`  Error:`, text)
            }
        } catch (err) {
            console.log(`  Fetch Error:`, err.message)
        }
    }
}
run()
