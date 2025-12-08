'use client'

import { useEffect, useState } from 'react'
// import { useLanguage } from '../contexts/LanguageContext'

interface Activity {
    id: string
    user: string
    action: string
    item: string
    timeAgo: string
    type: 'purchase' | 'request'
}

export default function RecentActivity() {
    // const { t } = useLanguage()
    const [activities, setActivities] = useState<Activity[]>([])

    useEffect(() => {
        // 초기 더미 데이터 생성
        const dummyActivities: Activity[] = [
            { id: '1', user: 'kim**', action: 'purchased', item: 'Olive Young Care Plus', timeAgo: '2m ago', type: 'purchase' },
            { id: '2', user: 'lee**', action: 'requested', item: 'Musinsa Standard Slacks', timeAgo: '5m ago', type: 'request' },
            { id: '3', user: 'par**', action: 'purchased', item: 'Torriden Dive In Serum', timeAgo: '12m ago', type: 'purchase' },
            { id: '4', user: 'cho**', action: 'purchased', item: 'Mediheal Tea Tree Pad', timeAgo: '15m ago', type: 'purchase' },
            { id: '5', user: 'kan**', action: 'requested', item: 'Nike Dunk Low', timeAgo: '23m ago', type: 'request' },
            { id: '6', user: 'jun**', action: 'purchased', item: 'Round Lab Sunscreen', timeAgo: '28m ago', type: 'purchase' },
            { id: '7', user: 'yoo**', action: 'purchased', item: 'Peripera Ink Mood Glowy Tint', timeAgo: '35m ago', type: 'purchase' },
            { id: '8', user: 'han**', action: 'requested', item: 'Gentle Monster Sunglasses', timeAgo: '42m ago', type: 'request' },
            { id: '9', user: 'min**', action: 'purchased', item: 'Innisfree Retinol Ampoule', timeAgo: '48m ago', type: 'purchase' },
            { id: '10', user: 'seo**', action: 'purchased', item: 'Rom&nd Juicy Lasting Tint', timeAgo: '1h ago', type: 'purchase' },
        ]
        setActivities(dummyActivities)
    }, [])

    return (
        <section className="px-4 mt-8 mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-lg font-bold text-slate-800">
                    Live Activity
                </h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                    {activities.map((activity) => (
                        <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activity.type === 'purchase' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {activity.user.substring(0, 1)}
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-0.5">
                                        <span className="font-bold text-slate-900">{activity.user}</span>
                                        {' '}
                                        {activity.type === 'purchase' ? 'just bought' : 'requested'}
                                    </div>
                                    <div className="text-sm font-medium text-slate-800 line-clamp-1">
                                        {activity.item}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2">
                                {activity.timeAgo}
                            </span>
                        </div>
                    ))}
                </div>

                {/* 더보기 버튼 같은 느낌의 하단 처리 */}
                <div className="p-3 text-center bg-slate-50 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400">
                        Real-time updates typical for this time of day
                    </p>
                </div>
            </div>
        </section>
    )
}
