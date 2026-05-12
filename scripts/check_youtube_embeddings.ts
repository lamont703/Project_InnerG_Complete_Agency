
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmbeddings() {
    const { data, error } = await supabase
        .from('document_embeddings')
        .select('source_table, count')
        .select('source_table')
    
    if (error) {
        console.error('Error fetching embeddings:', error)
        return
    }

    const counts = data.reduce((acc, curr) => {
        acc[curr.source_table] = (acc[curr.source_table] || 0) + 1
        return acc
    }, {})

    console.log('Embedding counts per table:')
    console.table(counts)

    const { data: jobs, error: jobsErr } = await supabase
        .from('embedding_jobs')
        .select('source_table, status')

    if (jobsErr) {
        console.error('Error fetching jobs:', jobsErr)
        return
    }

    const jobCounts = jobs.reduce((acc, curr) => {
        const key = `${curr.source_table} (${curr.status})`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    console.log('Embedding job counts:')
    console.table(jobCounts)
}

checkEmbeddings()
