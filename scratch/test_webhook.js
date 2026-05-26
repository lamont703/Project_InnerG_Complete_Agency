async function sendTestWebhook() {
  const webhookUrl = 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/f5baeadc-38a5-411a-80dc-079b86ca44c3';

  // Sample high-fidelity payload matching your Supabase trigger exactly
  const payload = {
    contact_id: 'GKxXg65w0drgiSxoykTg',
    new_record: {
      id: '941152ec-0334-4bf8-822f-e48f1b673b84',
      contact_id: 'GKxXg65w0drgiSxoykTg',
      shop_name: 'Sauccy Fades Dallas Barbershop',
      owner_name: 'Silverio Espinoza',
      phone: '+12544208647',
      city: 'Dallas',
      hiring_need: true,
      rent_type: 'Booth Rent',
      specialty_desired: 'Unknown',
      booth_count_available: 2,
      last_conversation_history: 'Sample Outreach History...',
      created_at: '2026-05-22T01:02:54.763Z',
      updated_at: '2026-05-22T19:38:41.476Z',
      conversation_turns: [],
      rent_rate: '$225/chair',
      email: 'silverioespinoza35@gmail.com',
      outreach_status: 'user_responded',
      last_contacted_at: '2026-05-22T18:49:09.952Z',
      outreach_attempts: 1,
      place_id: 'ChIJlwxjv0EnTIYRvJavGvFlCwg',
      formatted_address: '11909 Preston Rd, Dallas, TX 75230, USA',
      website: 'https://sauccyfades.com/',
      latitude: '32.9113971',
      longitude: '-96.8056195',
      rating: '5',
      total_reviews: 517,
      place_types: 'barber_shop | establishment',
      business_status: 'OPERATIONAL'
    }
  };

  console.log(`📡 Sending test payload to GoHighLevel webhook...`);
  console.log(`   URL: ${webhookUrl}\n`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const responseText = await response.text();

    console.log(`==================================================`);
    console.log(`🏁 WEBHOOK DISPATCH COMPLETE`);
    console.log(`🟢 Response Status: ${status}`);
    console.log(`💬 Response Body:   ${responseText}`);
    console.log(`==================================================`);

  } catch (error) {
    console.error(`❌ Failed to send webhook:`, error.message);
  }
}

sendTestWebhook();
