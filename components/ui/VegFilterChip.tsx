'use client'
import { MdFilterList, MdCircle } from 'react-icons/md'
import { useLanguage } from '@/lib/context/language-context'

interface Props {
  value: 'all' | 'veg' | 'nonveg'
  onChange: (val: 'all' | 'veg' | 'nonveg') => void
}

const chipDefs = [
  { id: 'all',    labelKey: 'all',      Icon: MdFilterList, activeClass: 'bg-primary-600 text-white border-primary-600', inactiveClass: 'border-gray-200 text-gray-600' },
  { id: 'veg',    labelKey: 'veg',      Icon: MdCircle,     activeClass: 'bg-green-600 text-white border-green-600',     inactiveClass: 'border-green-200 text-green-600' },
  { id: 'nonveg', labelKey: 'nonVeg',   Icon: MdCircle,     activeClass: 'bg-red-500 text-white border-red-500',         inactiveClass: 'border-red-200 text-red-500' },
] as const

export default function VegFilterChip({ value, onChange }: Props) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-1.5">
      {chipDefs.map(({ id, labelKey, Icon, activeClass, inactiveClass }) => (
        <button
          suppressHydrationWarning
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-200 ${
            value === id ? activeClass : inactiveClass + ' bg-white hover:bg-gray-50'
          }`}
        >
          <Icon className={`w-3.5 h-3.5 ${value === id ? 'text-white' : ''}`} />
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}