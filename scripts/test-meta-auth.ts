import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Zero-dependency .env.local loader
function loadEnv() {
    const envPath = path.resolve('.env.local')
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        content.split('\n').forEach(line => {
            const [key, ...value] = line.split('=')
            if (key && value) {
                process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1')
            }
        })
    }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testMetaIntegration() {
    console.log('--------------------------------------------------')
    console.log('🚀  Meta / Instagram Integration Test Tool')
    console.log('--------------------------------------------------')
    
    // 1. Fetch Facebook connection from DB
    const { data: fbConn, error: fbErr } = await supabase
        .from('client_db_connections')
        .select('*')
        .eq('db_type', 'facebook')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (fbErr || !fbConn) {
        console.error('❌ Error: No Facebook connection found in DB.')
        return
    }

    const { access_token, page_id, page_access_token, page_name } = fbConn.sync_config
    console.log(`✅ Found Facebook Page: ${page_name} (${page_id})`)
    
    // 2. Fetch Instagram connection
    const { data: igAcc, error: igErr } = await supabase
        .from('instagram_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (igErr || !igAcc) {
        console.log('⚠️  Warning: No Instagram account found in DB.')
    } else {
        console.log(`✅ Found Instagram Account: @${igAcc.username} (${igAcc.instagram_business_id})`)
    }

    const version = 'v22.0' 
    const baseUrl = `https://graph.facebook.com/${version}`

    // 3. Test Reading Facebook Page Info
    console.log('\n🔍 Testing Facebook Page Read...')
    const fbRes = await fetch(`${baseUrl}/${page_id}?fields=about,engagement,fan_count,talking_about_count&access_token=${page_access_token}`)
    const fbData: any = await fbRes.json()
    
    if (fbData.error) {
        console.error('❌ Facebook Read Error:', fbData.error.message)
    } else {
        console.log(`✨ Success! Current Page Fans: ${fbData.fan_count}`)
    }

    // 4. Test Reading Instagram Info
    if (igAcc) {
        console.log('\n🔍 Testing Instagram Read...')
        const igRes = await fetch(`${baseUrl}/${igAcc.instagram_business_id}?fields=username,followers_count,media_count&access_token=${access_token}`)
        const igData: any = await igRes.json()
        
        if (igData.error) {
            console.error('❌ Instagram Read Error:', igData.error.message)
        } else {
            console.log(`✨ Success! @${igData.username} has ${igData.followers_count} followers and ${igData.media_count} posts.`)
        }
    }

    // --- POSTING TEST ---
    console.log('\n--------------------------------------------------')
    console.log('🏗️  Testing Facebook Feed Post...')
    const fbPostRes = await fetch(`${baseUrl}/${page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: `🚀 SUCCESS! Facebook API Write Access Verified from AI Integration on ${new Date().toLocaleString()}`,
            access_token: page_access_token
        })
    })
    const fbPostData: any = await fbPostRes.json()
    
    if (fbPostData.error) {
        console.error('❌ FB Post Error:', fbPostData.error.message)
    } else {
        console.log(`✅ SUCCESS! Posted to Facebook Page. Post ID: ${fbPostData.id}`)
    }

    // --- INSTAGRAM POSTING TEST ---
    if (igAcc) {
        console.log('\n--------------------------------------------------')
        console.log('🏗️  Testing Instagram Post...')
        
        // 1. Create Media Container
        console.log('1️⃣  Creating media container...')
        const mediaRes = await fetch(`${baseUrl}/${igAcc.instagram_business_id}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
                caption: `🚀 AI Integration Success! Live post from script on ${new Date().toLocaleString()}`,
                access_token: access_token
            })
        })
        const mediaData: any = await mediaRes.json()
        
        if (mediaData.id) {
            console.log('⏳ Waiting 10 seconds for Instagram to process the media...')
            await new Promise(resolve => setTimeout(resolve, 10000))

            console.log('2️⃣  Publishing container...')
            // 2. Publish Container
            const publishRes = await fetch(`${baseUrl}/${igAcc.instagram_business_id}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: mediaData.id,
                    access_token: access_token
                })
            })
            const publishData: any = await publishRes.json()
            if (publishData.id) {
                console.log(`✅ SUCCESS! Posted to Instagram. Media ID: ${publishData.id}`)
            } else {
                console.error('❌ IG Publish Error:', publishData.error?.message)
            }
        } else {
            console.error('❌ IG Container Error:', mediaData.error?.message)
        }
    }

    console.log('\n--------------------------------------------------')
    console.log('📝 INSTAGRAM POSTING INSTRUCTIONS')
    console.log('--------------------------------------------------')
    console.log('To test an Instagram post, you will need to provide an image_url.')
    console.log('See the commented block at the very bottom of scripts/test-meta-auth.ts')
    console.log('--------------------------------------------------\n')
}

testMetaIntegration().catch(err => {
    console.error('❌ Script Error:', err)
})
