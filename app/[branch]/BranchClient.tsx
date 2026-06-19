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
import { MdOutlineRestaurantMenu } from 'react-icons/md'

export default function BranchClient() {
  const { branch, categories, items } = useBranchData()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
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

  const hasMenuFeature = branch.features?.includes('menu') ?? true;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <BranchHeader branch={branch} />
      
      {!hasMenuFeature ? (
        <div className="flex flex-col items-center justify-center pt-32 px-4 text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <MdOutlineRestaurantMenu className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('menuUnavailable') || 'Menu Unavailable'}</h2>
          <p className="text-gray-500 max-w-sm text-sm">
            {t('menuUnavailableDesc') || 'This branch is not currently displaying its menu online. Please contact the staff for assistance.'}
          </p>
        </div>
      ) : (
        <>
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          
          {/* Hide banner and categories when searching to make room for keyboard and results */}
          {(!isSearchFocused && search.trim() === '') && (
            <>
              <HeroBanner branchId={branch.id} />
              <CategoryChips
                categories={categories.map(({ id, name }) => ({ id, name }))}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </>
          )}

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
        </>
      )}
    </div>
  )
}
