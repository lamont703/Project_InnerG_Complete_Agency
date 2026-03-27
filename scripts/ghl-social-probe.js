const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4"
const locationId = "QLyYYRoOhCg65lKW9HDX"

async function run() {
    console.log("--- Social Planner Discovery Probe ---")
    
    // Set dates for the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const headers = {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28"
    }

    const body = JSON.stringify({
        type: "all",
        skip: "0",
        limit: "10",
        fromDate: thirtyDaysAgo.toISOString(),
        toDate: now.toISOString(),
        includeUsers: "true",
        postType: "post"
    })

    try {
        const url = `https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts/list`
        console.log(`Probing: ${url}`)
        
        const res = await fetch(url, {
            method: "POST",
            headers,
            body
        })

        console.log(`Status: ${res.status} ${res.statusText}`)
        const data = await res.json()
        
        if (res.ok) {
            console.log("SUCCESS! Found posts records.")
            console.log("Count:", data.results?.posts?.length || 0)
            console.log("Full Response:", JSON.stringify(data, null, 2))
        } else {
            console.error("Error Response:", data)
        }
    } catch (err) {
        console.error("Fetch Error:", err.message)
    }
}
run()
