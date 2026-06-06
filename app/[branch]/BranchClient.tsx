//app/[branch]/BranchClient.tsx

'use client'

import { useState } from 'react'
import type { Branch, Category, MenuItem } from '@/lib/types'
import { SessionProvider } from '@/lib/context/session-context'
import BranchHeader from '@/components/layout/BranchHeader'
import SearchBar from '@/components/ui/SearchBar'
import CategoryChips from '@/components/menu/CategoryChips'
import HeroBanner from '@/components/ui/HeroBanner'
import ItemCard from '@/components/menu/ItemCard'
import VegFilterChip from '@/components/ui/VegFilterChip'
import { useBranchData } from '@/lib/context/branch-context'
import { useLanguage } from '@/lib/context/language-context'

export default function BranchClient() {
  const { branch, categories, items } = useBranchData()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all')

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        search === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !selectedCategory || item.category_id === selectedCategory
      const matchesVeg =
        vegFilter === 'all' ||
        (vegFilter === 'veg' && item.is_veg) ||
        (vegFilter === 'nonveg' && !item.is_veg)
      return matchesSearch && matchesCategory && matchesVeg
    })
    // Push out-of-stock items to the bottom
    .sort((a, b) => Number(!a.is_available) - Number(!b.is_available))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <BranchHeader branch={branch} />
      <SearchBar value={search} onChange={setSearch} />
      <HeroBanner branchId={branch.id} />
      <CategoryChips
        categories={categories.map(({ id, name }) => ({ id, name }))}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="flex items-center justify-between px-4 mt-4 mb-3">
        <h2 className="text-lg font-bold text-gray-900">{t('allItems')}</h2>
        <VegFilterChip value={vegFilter} onChange={setVegFilter} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 mt-4 mb-24">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} branchSlug={branch.slug} />
          ))
        ) : (
            <p className="text-gray-400 text-sm col-span-full text-center py-12">
            {t('noItemsFound')}
          </p>
        )}
      </div>
    </div>
  )
}
