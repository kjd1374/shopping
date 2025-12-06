'use client'

import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 border border-slate-200 shadow-sm">
      <button
        onClick={() => setLanguage('ko')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          language === 'ko'
            ? 'bg-slate-900 text-white'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        한국어
      </button>
      <button
        onClick={() => setLanguage('vi')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          language === 'vi'
            ? 'bg-slate-900 text-white'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Tiếng Việt
      </button>
    </div>
  )
}

