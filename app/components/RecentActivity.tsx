'use client'

import { useEffect, useState } from 'react'

interface Activity {
    id: string
    user: string
    action: string
    item: string
    timeAgo: string
    type: 'purchase' | 'request'
}

const DUMMY_ACTIVITIES: Activity[] = [
    { id: '1', user: 'kim**', action: 'purchased', item: 'Olive Young Care Plus Spot Patch', timeAgo: 'Just now', type: 'purchase' },
    { id: '2', user: 'lee**', action: 'requested', item: 'Musinsa Standard Wide Slacks', timeAgo: '1m ago', type: 'request' },
    { id: '3', user: 'par**', action: 'purchased', item: 'Torriden Dive In Serum 50ml', timeAgo: '2m ago', type: 'purchase' },
    { id: '4', user: 'cho**', action: 'purchased', item: 'Mediheal Tea Tree Trouble Pad', timeAgo: '3m ago', type: 'purchase' },
    { id: '5', user: 'kan**', action: 'requested', item: 'Nike Dunk Low Retro Black White', timeAgo: '5m ago', type: 'request' },
    { id: '6', user: 'jun**', action: 'purchased', item: 'Round Lab Birch Juice Sunscreen', timeAgo: '7m ago', type: 'purchase' },
    { id: '7', user: 'yoo**', action: 'purchased', item: 'Peripera Ink Mood Glowy Tint', timeAgo: '9m ago', type: 'purchase' },
    { id: '8', user: 'han**', action: 'requested', item: 'Gentle Monster Lilit 01', timeAgo: '11m ago', type: 'request' },
    { id: '9', user: 'min**', action: 'purchased', item: 'Innisfree Retinol Cica Ampoule', timeAgo: '14m ago', type: 'purchase' },
    { id: '10', user: 'seo**', action: 'purchased', item: 'Rom&nd Juicy Lasting Tint #25', timeAgo: '16m ago', type: 'purchase' },
    { id: '11', user: 'cha**', action: 'purchased', item: 'Banila Co Clean It Zero', timeAgo: '18m ago', type: 'purchase' },
    { id: '12', user: 'son**', action: 'requested', item: 'Mardi Mercredi Sweatshirt', timeAgo: '21m ago', type: 'request' },
    { id: '13', user: 'hwang**', action: 'purchased', item: 'Ma:nyo Pure Cleansing Oil', timeAgo: '24m ago', type: 'purchase' },
    { id: '14', user: 'nam**', action: 'requested', item: 'Stussy World Tour Tee', timeAgo: '27m ago', type: 'request' },
    { id: '15', user: 'ryu**', action: 'purchased', item: 'Anua Heartleaf 77 Toner', timeAgo: '30m ago', type: 'purchase' },
    { id: '16', user: 'lim**', action: 'purchased', item: 'Laneige Lip Sleeping Mask', timeAgo: '32m ago', type: 'purchase' },
    { id: '17', user: 'ko**', action: 'requested', item: 'Cos Quilted Micro Bag', timeAgo: '35m ago', type: 'request' },
    { id: '18', user: 'shin**', action: 'purchased', item: 'Dr.G. Red Blemish Clear Soothing Cream', timeAgo: '38m ago', type: 'purchase' },
    { id: '19', user: 'oh**', action: 'purchased', item: 'Clio Kill Cover Mesh Glow Cushion', timeAgo: '41m ago', type: 'purchase' },
    { id: '20', user: 'kwon**', action: 'requested', item: 'New Balance 530 Steel Grey', timeAgo: '45m ago', type: 'request' },
    { id: '21', user: 'jang**', action: 'purchased', item: 'Dalsim ABC Juice', timeAgo: '48m ago', type: 'purchase' },
    { id: '22', user: 'ahn**', action: 'purchased', item: 'Goodal Green Tangerine Vita C Serum', timeAgo: '51m ago', type: 'purchase' },
    { id: '23', user: 'song**', action: 'requested', item: 'Emis New Logo Cap', timeAgo: '55m ago', type: 'request' },
    { id: '24', user: 'yang**', action: 'purchased', item: 'Aestura Atobarrier 365 Cream', timeAgo: '58m ago', type: 'purchase' },
    { id: '25', user: 'hong**', action: 'purchased', item: 'Skin1004 Madagascar Centella Ampoule', timeAgo: '1h ago', type: 'purchase' },
    { id: '26', user: 'kim**', action: 'requested', item: 'Matin Kim Logo T-shirt', timeAgo: '1h ago', type: 'request' },
    { id: '27', user: 'lee**', action: 'purchased', item: '3CE Mood Recipe Face Blush', timeAgo: '1h 5m ago', type: 'purchase' },
    { id: '28', user: 'park**', action: 'purchased', item: 'Vussen Whitening Toothpaste', timeAgo: '1h 10m ago', type: 'purchase' },
    { id: '29', user: 'choi**', action: 'requested', item: 'Tamburins Hand Cream 000', timeAgo: '1h 15m ago', type: 'request' },
    { id: '30', user: 'jeong**', action: 'purchased', item: 'Illiyoon Ceramide Ato Lotion', timeAgo: '1h 20m ago', type: 'purchase' },
]

export default function RecentActivity() {
    // Seamless 무한 스크롤을 위해 배열을 두 번 이어 붙임
    const [displayActivities, setDisplayActivities] = useState<Activity[]>([])

    useEffect(() => {
        setDisplayActivities([...DUMMY_ACTIVITIES, ...DUMMY_ACTIVITIES])
    }, [])

    return (
        <section className="px-4 mt-8 mb-8">
            <style jsx global>{`
                @keyframes scroll-vertical {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                .animate-scroll-vertical {
                    animation: scroll-vertical 60s linear infinite;
                }
                .animate-scroll-vertical:hover {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-lg font-bold text-slate-800">
                    Live Activity
                </h2>
                <span className="text-xs font-medium text-slate-400 ml-auto">
                    Real-time
                </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[320px] relative">
                {/* 그라데이션 오버레이로 위아래 페이드 효과 */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

                <div className="animate-scroll-vertical">
                    <div className="divide-y divide-slate-50">
                        {displayActivities.map((activity, idx) => (
                            <div key={`${activity.id}-${idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 min-w-[32px] rounded-full flex items-center justify-center text-xs font-bold ${activity.type === 'purchase' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {activity.user.substring(0, 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                                            <span className="font-bold text-slate-900">{activity.user}</span>
                                            {activity.type === 'purchase' ? (
                                                <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[10px]">구매완료</span>
                                            ) : (
                                                <span className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded text-[10px]">견적요청</span>
                                            )}
                                        </div>
                                        <div className="text-sm font-medium text-slate-800 truncate">
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
                </div>
            </div>
        </section>
    )
}
