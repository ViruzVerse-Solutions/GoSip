//app/[branch]/layout.tsx

import { notFound } from 'next/navigation'
import { fetchBranchBySlug, fetchMenuByBranch, fetchSignatureItems } from '@/lib/services/menu.service'
import { BranchProvider } from '@/lib/context/branch-context'
import CartBar from '@/components/layout/CartBar'
import CartModal from '@/components/layout/CartModal'

export default async function BranchLayout({
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