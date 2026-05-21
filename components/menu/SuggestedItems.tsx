'use client'

import { useBranchData } from '@/lib/context/branch-context'
import ItemCard from './ItemCard'

export default function SuggestedItems({ currentItemId }: { currentItemId: string }) {
  const { items, branch } = useBranchData()

  const currentItem = items.find((i) => i.id === currentItemId)
  const categoryId = currentItem?.category_id

  const suggested = items
    .filter((i) => i.id !== currentItemId && (categoryId ? i.category_id === categoryId : true))
    .slice(0, 4)

  if (suggested.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-3">You might also like</h3>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {suggested.map((item) => (
          <ItemCard key={item.id} item={item} branchSlug={branch.slug} layout="col" />
        ))}
      </div>
    </div>
  )
}