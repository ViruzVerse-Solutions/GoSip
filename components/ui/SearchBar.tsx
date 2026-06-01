import { MdSearch } from 'react-icons/md'
import { useBranchData } from '@/lib/context/branch-context'

export default function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { branch } = useBranchData()
  return (
    <div className="relative mx-4 mt-4 mb-3">
      <input
        type="text"
        placeholder={`Search in ${branch?.name || 'Café'}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-14 pl-12 pr-4 rounded-full bg-white border border-gray-200 text-gray-900 placeholder-gray-300 outline-none focus:border-primary-500 transition-colors"
      />
      <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
    </div>
  )
}