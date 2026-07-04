//app/[branch]/layout.tsx

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { fetchBranchBySlug, fetchMenuByBranch, fetchSignatureItems } from '@/lib/services/menu.service'
import { BranchProvider } from '@/lib/context/branch-context'
import CartBar from '@/components/layout/CartBar'
import CartModal from '@/components/layout/CartModal'
import SkeletonCard from '@/components/ui/SkeletonCard'

export const unstable_instant = {
  prefetch: 'runtime',
  samples: [
    {
      params: { branch: 'sample-branch', itemId: 'sample-item', token: 'sample-token' },
      headers: [['x-nonce', 'sample-nonce']],
    },
  ],
}

export default function BranchLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ branch: string }>
}) {
  return (
    <Suspense fallback={<BranchLoadingSkeleton />}>
      <BranchLayoutContent params={params}>
        {children}
      </BranchLayoutContent>
    </Suspense>
  )
}

/** Full-page skeleton shown while SSR data is streaming in */
function BranchLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header skeleton */}
      <div className="h-[200px] skeleton" />

      {/* Search bar skeleton */}
      <div className="px-4 mt-4">
        <div className="h-11 rounded-2xl skeleton" />
      </div>

      {/* Category chips skeleton */}
      <div className="flex gap-2 px-4 mt-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full skeleton shrink-0" />
        ))}
      </div>

      {/* Title row */}
      <div className="px-4 mt-4 mb-3">
        <div className="h-6 w-24 rounded-md skeleton" />
      </div>

      {/* Item grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

async function BranchLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params

  if (!branchSlug) notFound()

  const branch = await fetchBranchBySlug(branchSlug)
  if (!branch) notFound()

  const hasMenuFeature = branch.features?.includes('menu') ?? true;
  
  const [menu, signatures] = hasMenuFeature ? await Promise.all([
    fetchMenuByBranch(branch.id),
    fetchSignatureItems(branch.id),
  ]) : [{ categories: [], items: [] }, []];

  return (
    <BranchProvider
      branch={branch}
      categories={menu.categories}
      items={menu.items}
      signatures={signatures}
    >
      {children}
      {branch.features?.includes('qr_ordering') && branch.is_open && (
        <>
          <CartBar />
          <CartModal branchSlug={branch.slug} branchId={branch.id} />
        </>
      )}
    </BranchProvider>
  )
}