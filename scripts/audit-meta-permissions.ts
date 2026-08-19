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
const version = 'v21.0'
const baseUrl = `https://graph.facebook.com/${version}`

/**
 * THERE ARE TWO INSTAGRAM APIS AND THEY ARE NOT INTERCHANGEABLE.
 *
 *   Instagram API with FACEBOOK Login   -> graph.facebook.com, a Facebook User
 *                                          token, permissions readable at
 *                                          /me/permissions, reaches Instagram
 *                                          through a Page.
 *   Instagram API with INSTAGRAM Login  -> graph.instagram.com, a token that
 *                                          begins "IGAA", no Page involved, and
 *                                          NO /me/permissions endpoint at all.
 *
 * This script was written for the first and the stored token is the second, so
 * it reported "Cannot parse access token" and looked like an expired-credential
 * problem. It is not: a brand-new working Instagram Login token fails here in
 * exactly the same way, which is the kind of error that sends someone
 * re-authorising over and over wondering why nothing changes.
 *
 * So detect the token type first and audit it the way that token can be
 * audited. Instagram Login tokens do not enumerate their grants, so capability
 * is established by calling the endpoints the permissions gate and reading what
 * comes back.
 */
const isInstagramLoginToken = (t: string) => t.startsWith('IGAA')

/** The four scopes Instagram Login can carry. */
const IG_LOGIN_SCOPES = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
]

async function auditInstagramLoginToken(token: string) {
    console.log('Token type: Instagram Login (graph.instagram.com)\n')

    const me = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${token}`)
    const meData: any = await me.json()

    if (meData.error) {
        console.error('❌ ' + meData.error.message)
        if (/expired/i.test(meData.error.message || '')) {
            console.error('\nThis token is past its 60-day life. Meta does not allow refreshing an')
            console.error('expired token - it has to be re-authorised through the OAuth flow.')
        }
        return
    }

    console.log(`✅ Connected as @${meData.username}  (id ${meData.id}, ${meData.account_type})\n`)
    console.log('Scopes are not enumerable for this token type, so capability is')
    console.log('probed by calling what each permission gates:\n')

    // instagram_business_content_publish gates the publishing container endpoint.
    // A GET on it is harmless and tells us whether the grant is there.
    const pub = await fetch(`https://graph.instagram.com/${meData.id}/media?limit=1&access_token=${token}`)
    const pubData: any = await pub.json()
    const canRead = !pubData.error
    console.log(`${canRead ? '✅ READY   ' : '⚠️  MISSING'} | instagram_business_basic (read own media)`)
    if (pubData.error) console.log(`             ${pubData.error.message}`)

    console.log('\nTo confirm instagram_business_content_publish, create a media container')
    console.log('and do NOT publish it - that call fails with a permission error if the')
    console.log('grant is absent, and costs nothing if it succeeds.')
    console.log('\nAll four Instagram Login scopes:')
    IG_LOGIN_SCOPES.forEach((sc) => console.log(`  - ${sc}`))
}

async function auditPermissions() {
    console.log('--------------------------------------------------')
    console.log('🛡️  Meta / Instagram Permission Audit Tool')
    console.log('--------------------------------------------------')

    if (!accessToken) {
        console.error('❌ Error: INSTAGRAM_ACCESS_TOKEN not found in .env.local')
        return
    }

    if (isInstagramLoginToken(accessToken)) {
        await auditInstagramLoginToken(accessToken)
        return
    }

    console.log('Token type: Facebook Login (graph.facebook.com)\n')
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
