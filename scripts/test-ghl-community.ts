const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4"
const locationId = "QLyYYRoOhCg65lKW9HDX"

async function run() {
    console.log("--- GHL Community Discovery Script ---")
    console.log("Targeting Location:", locationId)

    const headers = {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Version": "2021-07-28"
    }

    try {
        // 1. Fetch Groups
        console.log("\n[1/3] Fetching Community Groups...")
        const groupsRes = await fetch(`https://services.leadconnectorhq.com/communities/groups?locationId=${locationId}`, { headers })
        const groupsData = await groupsRes.json()
        
        if (!groupsRes.ok) {
            console.error("Groups Error:", groupsData)
            return
        }

        const groups = groupsData.groups || []
        console.log(`Found ${groups.length} groups.`)

        for (const group of groups) {
            console.log(`\n--- Group: ${group.name} (ID: ${group.id}) ---`)
            
            // 2. Fetch Channels in Group
            console.log(`[2/3] Fetching Channels for ${group.name}...`)
            const channelsRes = await fetch(`https://services.leadconnectorhq.com/communities/groups/${group.id}/channels`, { headers })
            const channelsData = await channelsRes.json()
            const channels = channelsData.channels || []
            console.log(`Found ${channels.length} channels.`)

            for (const channel of channels) {
                console.log(`  - Channel: ${channel.name} (ID: ${channel.id})`)
                
                // 3. Fetch Posts in Channel
                console.log(`  [3/3] Fetching Recent Posts for ${channel.name}...`)
                const postsRes = await fetch(`https://services.leadconnectorhq.com/communities/channels/${channel.id}/posts?limit=5`, { headers })
                const postsData = await postsRes.json()
                const posts = postsData.posts || []
                console.log(`  Found ${posts.length} recent posts.`)

                for (const post of posts) {
                    console.log(`    > [Post] ${post.title || post.content?.substring(0, 50)}... by ${post.username}`)
                }
            }
        }

    } catch (err) {
        console.error("Execution Error:", err)
    }
}

run()
