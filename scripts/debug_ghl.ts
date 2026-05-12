const ghlApiKey = Deno.env.get("GHL_API_KEY")
const locationId = Deno.env.get("GHL_LOCATION_ID")

console.log("GHL_LOCATION_ID:", locationId)
if (ghlApiKey) {
    console.log("GHL_API_KEY length:", ghlApiKey.length)
    console.log("GHL_API_KEY starts with:", ghlApiKey.substring(0, 10))
} else {
    console.log("GHL_API_KEY is not set")
}

const response = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`, {
    headers: {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Version": "2021-07-28"
    }
})

console.log("Status:", response.status)
console.log("Response:", await response.text())
