'use client'

import { useState } from 'react'
import { createTestUsers } from '@/app/actions/dev'

export default function DevSetupPage() {
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        setLoading(true)
        try {
            const res = await createTestUsers()
            setResults(res)
        } catch (e) {
            console.error(e)
            alert('Error creating users')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">⚙️ Dev: Setup Test Accounts</h1>

            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-yellow-800 mb-2">Step 1: Create Supabase Schema</h3>
                <p className="text-sm text-yellow-700 mb-2">
                    Make sure you have run the content of <code>supabase_roles.sql</code> in your Supabase SQL Editor first.
                </p>
            </div>

            <div className="mb-8">
                <h3 className="font-bold mb-4">Step 2: Create Auth Users</h3>
                <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? 'Creating...' : 'Create Test Users (user/admin/partner)'}
                </button>

                {results.length > 0 && (
                    <div className="mt-4 bg-gray-100 p-4 rounded text-sm">
                        <pre>{JSON.stringify(results, null, 2)}</pre>
                    </div>
                )}
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">Step 3: Promote Roles (Important!)</h3>
                <p className="text-sm text-green-700 mb-4">
                    After creating the users, run this SQL in Supabase to assign the correct roles:
                </p>
                <pre className="bg-gray-800 text-white p-4 rounded overflow-auto text-xs">
                    {`-- SQL to Update Roles
update public.profiles set role = 'admin' where email = 'admin@test.com';
update public.profiles set role = 'partner' where email = 'partner@test.com';`}
                </pre>
            </div>

            <div className="mt-8">
                <h3 className="font-bold mb-2">Credentials</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>User: <code>user@test.com</code> / <code>password123</code></li>
                    <li>Admin: <code>admin@test.com</code> / <code>password123</code></li>
                    <li>Partner: <code>partner@test.com</code> / <code>password123</code></li>
                </ul>
            </div>
        </div>
    )
}
