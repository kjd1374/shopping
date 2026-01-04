
'use client'
import { useState } from 'react'
import { checkDBStatus } from '../actions/debug-db'

export default function DebugPage() {
    const [result, setResult] = useState<any>(null)

    const handleCheck = async () => {
        const res = await checkDBStatus()
        setResult(res)
    }

    return (
        <div className="p-10">
            <h1 className="text-xl font-bold mb-4">DB Debugger</h1>
            <button onClick={handleCheck} className="bg-blue-500 text-white px-4 py-2 rounded">Check DB</button>
            <pre className="mt-4 bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
            </pre>
        </div>
    )
}
