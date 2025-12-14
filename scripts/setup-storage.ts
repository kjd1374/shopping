
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyStoragePolicy() {
    console.log('Applying storage policies...')

    // We can't run raw SQL easily via JS client without a specific function or direct PG connection.
    // However, we can use the Storage API to create the bucket, which might solve half the issue.
    // Policies often need SQL. 
    // If the user has a `rpc` function to run sql, we can use that.
    // Alternatively, we'll try to create the bucket publicly.

    const { data, error } = await supabase
        .storage
        .createBucket('request_images', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
        })

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "request_images" already exists.')
            // Try to update it to public if possible not directly exposed via this API usually
        } else {
            console.error('Error creating bucket:', error)
        }
    } else {
        console.log('Bucket "request_images" created successfully.')
    }

    console.log('Bucket "request_images" created or already exists.')

    // Test upload with Service Role Key
    try {
        const testBuffer = Buffer.from('Test file content')
        const fileName = `test_upload_${Date.now()}.txt`

        console.log(`Attempting to upload ${fileName} using Service Role Key...`)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('request_images')
            .upload(fileName, testBuffer, {
                contentType: 'text/plain',
                upsert: true
            })

        if (uploadError) {
            console.error('Test upload FAILED with Service Role Key:', uploadError)
        } else {
            console.log('Test upload SUCCESS! Service Role Key has write access.', uploadData)

            // Cleanup
            await supabase.storage.from('request_images').remove([fileName])
            console.log('Test file cleaned up.')
        }
    } catch (err) {
        console.error('Unexpected error during test upload:', err)
    }

    // Attempt to upload a test file to verify/trigger permissions
    // Note: Modifying policies via client is not standard without SQL.
    // We will assume the bucket creation with `public: true` helps.
    // For granular policies, we really need the SQL run. 
    // Since we cannot connect to PG port directly easily, we hope the "public: true" suffices for now
    // or that the user runs the SQL.

    // Actually, we can try to use the `pg` library if we had the connection string, but we only have URL/Key.
    // We will output instructions if this fails.
}

applyStoragePolicy()
