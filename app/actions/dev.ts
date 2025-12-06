'use server'

import { createClient } from '../lib/supabase/server'

export async function createTestUsers() {
    const supabase = createClient()
    const users = [
        { email: 'user@test.com', password: 'password123', role: 'user' },
        { email: 'admin@test.com', password: 'password123', role: 'admin' },
        { email: 'partner@test.com', password: 'password123', role: 'partner' }
    ]

    const results = []

    for (const user of users) {
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    full_name: user.role === 'user' ? 'Test User' : user.role === 'admin' ? 'Administrator' : 'Partner Kim'
                }
            }
        })

        if (error) {
            results.push({ email: user.email, status: 'failed', error: error.message })
        } else if (data.user) {
            // NOTE: We cannot update the 'role' in 'profiles' here because we are running as anonymous/authenticated user, 
            // not service_role. The trigger will create the profile with 'user' role.
            // The user must manually run the SQL to upgrade roles.
            results.push({ email: user.email, status: 'created', id: data.user.id })
        } else {
            results.push({ email: user.email, status: 'exists_or_pending' })
        }
    }

    return results
}
