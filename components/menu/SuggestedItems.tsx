// components/menu/SuggestedItems.tsx
'use client'

import { useMemo } from 'react'
import { useBranchData } from '@/lib/context/branch-context'
import ItemCard from './ItemCard'

interface Props {
  currentItemId: string
}

const MAX_SUGGESTIONS = 6

export default function SuggestedItems({ currentItemId }: Props) {
  const { items, branch } = useBranchData()

  const { suggested, label } = useMemo(() => {
    const current = items.find((i) => i.id === currentItemId)
    if (!current) return { suggested: [], label: '' }

    const others = items.filter((i) => i.id !== currentItemId)

    // Score each candidate — higher = more relevant
    const scored = others.map((item) => {
      let score = 0
      if (item.category_id && item.category_id === current.category_id) score += 10
      if (item.is_veg === current.is_veg) score += 3
      // Prefer items in a similar price band (within ±40%)
      const priceDelta = Math.abs(item.price - current.price) / (current.price || 1)
      if (priceDelta <= 0.4) score += 2
      // Available items always rank above out-of-stock
      if (item.is_available) score += 5
      return { item, score }
    })

    const sorted = scored
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item)
      .slice(0, MAX_SUGGESTIONS)

    // Heading: be specific if we have same-category items
    const hasSameCategory = sorted.some(
      (i) => i.category_id === current.category_id
    )
    const sectionLabel = hasSameCategory
      ? 'More like this'
      : 'You might also like'

    return { suggested: sorted, label: sectionLabel }
  }, [items, currentItemId])

  if (suggested.length === 0) return null

  return (
    <section className="mt-6" aria-label="Suggested items">
      <h3 className="text-base font-bold text-gray-900 mb-3 px-1">{label}</h3>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {suggested.map((item) => (
          <ItemCard key={item.id} item={item} branchSlug={branch.slug} layout="col" />
        ))}
      </div>
    </section>
  )
}