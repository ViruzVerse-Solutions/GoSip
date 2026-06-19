'use client'
// components/ui/LanguageSelector.tsx

import { useState, useRef, useEffect, useCallback } from 'react'
import { MdLanguage, MdCheck, MdKeyboardArrowDown } from 'react-icons/md'
import { useLanguage } from '@/lib/context/language-context'
import { LANGUAGES, LanguageCode } from '@/lib/i18n/translations'

export default function LanguageSelector() {
  const { lang, setLang, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const select = useCallback((code: LanguageCode) => {
    setLang(code)
    setOpen(false)
  }, [setLang])

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        suppressHydrationWarning
        onClick={() => setOpen((o) => !o)}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
          text-gray-500 hover:text-primary-600
          hover:bg-primary-50 active:bg-primary-100
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-primary-400 focus-visible:ring-offset-2
          text-sm font-medium
        "
      >
        <MdLanguage className="w-[18px] h-[18px] shrink-0" aria-hidden />
        <span className="hidden sm:inline leading-none" style={{ fontFamily: 'sans-serif' }}>
          {language.name}
        </span>
        <MdKeyboardArrowDown
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <style>{`
            @keyframes dropdownFadeInScale {
              from { opacity: 0; transform: scale(0.95) translateY(-6px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-dropdown-menu {
              animation: dropdownFadeInScale 0.14s ease-out forwards;
              transform-origin: top right;
            }
          `}</style>
          <div
            role="listbox"
            aria-label="Language options"
            className="
              absolute right-0 top-full mt-2 z-50
              bg-white rounded-2xl shadow-xl
              border border-gray-100
              overflow-hidden w-52
              animate-dropdown-menu
            "
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)' }}
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Language
              </p>
            </div>

            {/* Language list */}
            <ul className="py-1 max-h-72 overflow-y-auto">
              {LANGUAGES.map((l) => {
                const active = l.code === lang
                return (
                  <li key={l.code}>
                    <button
                      role="option"
                      aria-selected={active}
                      onClick={() => select(l.code)}
                      className="
                        w-full flex items-center gap-3 px-4 py-2.5
                        text-left transition-colors duration-100
                        hover:bg-primary-50 active:bg-primary-100
                      "
                    >
                      {/* Native name + English name */}
                      <span className="flex-1 min-w-0">
                        <span
                          className="block text-sm font-semibold text-gray-800 leading-tight"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          {l.name}
                        </span>
                        <span className="block text-[11px] text-gray-400 leading-tight mt-0.5">
                          {l.englishName}
                        </span>
                      </span>

                      {/* Active checkmark */}
                      {active && (
                        <MdCheck
                          className="w-4 h-4 text-primary-500 shrink-0"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
