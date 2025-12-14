import React from 'react'

interface LoadingStateProps {
    message?: string
}

export default function LoadingState({ message = '로딩 중...' }: LoadingStateProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-500 text-sm font-medium animate-pulse">{message}</p>
            </div>
        </div>
    )
}
