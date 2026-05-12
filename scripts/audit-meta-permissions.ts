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

const accessToken = process.env.META_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
const version = 'v19.0'
const baseUrl = `https://graph.facebook.com/${version}`

async function auditPermissions() {
    console.log('--------------------------------------------------')
    console.log('🛡️  Meta / Instagram Permission Audit Tool')
    console.log('--------------------------------------------------')

    if (!accessToken) {
        console.error('❌ Error: INSTAGRAM_ACCESS_TOKEN not found in .env.local')
        return
    }

    console.log('🔍 Fetching current permission set from Meta Graph API...')
    const permRes = await fetch(`${baseUrl}/me/permissions?access_token=${accessToken}`)
    const permData: any = await permRes.json()

    if (permData.error) {
        console.error('❌ Error fetching permissions:', permData.error.message)
        return
    }

    const granted = permData.data
        .filter((p: any) => p.status === 'granted')
        .map((p: any) => p.permission)
    
    const declined = permData.data
        .filter((p: any) => p.status !== 'granted')
        .map((p: any) => p.permission)

    console.log(`\n✅ GRANTED PERMISSIONS (${granted.length}):`)
    console.log(granted.join(', '))

    if (declined.length > 0) {
        console.log(`\n❌ DECLINED/EXPIRED PERMISSIONS (${declined.length}):`)
        console.log(declined.join(', '))
    }

    // --- CHECKLIST FOR YOUR APP REVIEW ---
    const requiredPermissions = [
        'instagram_business_basic',
        'instagram_business_manage_insights',
        'instagram_business_content_publish',
        'instagram_business_manage_comments',
        'instagram_business_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'ads_read',
        'ads_management',
        'business_management'
    ]

    console.log('\n📊 AUDIT CHECKLIST FOR APP REVIEW:')
    console.log('--------------------------------------------------')

    for (const perm of requiredPermissions) {
        const isGranted = granted.includes(perm)
        const status = isGranted ? '✅ READY' : '⚠️  MISSING'
        console.log(`${status.padEnd(10)} | ${perm}`)
    }

    // --- FUNCTIONAL VERIFICATION ---
    console.log('\n🚀 STARTING FUNCTIONAL VERIFICATION...')
    console.log('--------------------------------------------------')

    // 1. Check Identity (instagram_business_basic)
    if (granted.includes('instagram_business_basic')) {
        console.log('Testing [instagram_business_basic]...')
        const meRes = await fetch(`${baseUrl}/me?fields=id,name&access_token=${accessToken}`)
        const meData: any = await meRes.json()
        if (meData.id) {
            console.log(`   ✨ Verified! User ID: ${meData.id}, Name: ${meData.name}`)
        } else {
            console.log(`   ❌ Failed identification check.`)
        }
    }

    // 2. Check Insights (instagram_business_manage_insights)
    if (granted.includes('instagram_business_manage_insights')) {
        console.log('Testing [instagram_business_manage_insights]...')
        // We need an IG Business ID. Let's try to find one from the pages.
        const pagesRes = await fetch(`${baseUrl}/me/accounts?fields=instagram_business_account{id,username}&access_token=${accessToken}`)
        const pagesData: any = await pagesRes.json()
        
        const igAccount = pagesData.data?.find((p: any) => p.instagram_business_account)?.instagram_business_account
        if (igAccount) {
            const insightRes = await fetch(`${baseUrl}/${igAccount.id}/insights?metric=follower_count&period=day&access_token=${accessToken}`)
            const insightData: any = await insightRes.json()
            if (!insightData.error) {
                console.log(`   ✨ Verified! Insights accessible for @${igAccount.username}`)
            } else {
                console.log(`   ❌ Failed insight check: ${insightData.error.message}`)
            }
        } else {
            console.log('   ⚠️  Skipped: No linked Instagram Business account found on your Pages.')
        }
    }

    // 3. Check Ads (ads_read)
    if (granted.includes('ads_read')) {
        console.log('Testing [ads_read]...')
        const adsRes = await fetch(`${baseUrl}/me/adaccounts?fields=name,account_status&access_token=${accessToken}`)
        const adsData: any = await adsRes.json()
        if (!adsData.error && adsData.data) {
            console.log(`   ✨ Verified! Found ${adsData.data.length} Ad Accounts.`)
        } else {
            console.log(`   ❌ Failed Ad check: ${adsData.error?.message || 'None found'}`)
        }
    }

    // 4. Check Pages (pages_show_list / pages_read_engagement)
    if (granted.includes('pages_show_list')) {
        console.log('Testing [pages_show_list]...')
        const accountsRes = await fetch(`${baseUrl}/me/accounts?access_token=${accessToken}`)
        const accountsData: any = await accountsRes.json()
        if (!accountsData.error && accountsData.data) {
            console.log(`   ✨ Verified! You manage ${accountsData.data.length} Pages.`)
        } else {
            console.log(`   ❌ Failed Page check.`)
        }
    }

    console.log('\n--------------------------------------------------')
    console.log('🏁 AUDIT COMPLETE')
    console.log('--------------------------------------------------')
    console.log('If all "READY" items have verified results, you are good to submit for review!')
}

auditPermissions().catch(err => {
    console.error('❌ Unexpected Error during audit:', err)
})
