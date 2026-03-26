const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4"
const locationId = "QLyYYRoOhCg65lKW9HDX"

const paths = [
    "/communities/groups",
    "/community/groups",
    "/communities/v1/groups",
    "/v1/communities/groups",
    "/communities/list",
    "/community/list",
    "/v1/community/groups"
]

async function run() {
    const headers = {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Version": "2021-07-28"
    }

    for (const path of paths) {
        console.log(`Trying ${path}...`)
        const res = await fetch(`https://services.leadconnectorhq.com${path}?locationId=${locationId}`, { headers })
        console.log(`  Status: ${res.status} ${res.statusText}`)
        if (res.status === 200) {
            console.log(`  SUCCESS! Body:`, await res.text())
        }
    }
}
run()
