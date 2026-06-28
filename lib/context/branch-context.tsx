'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import type { Branch, Category, MenuItem } from '@/lib/types'
import { supabaseBrowser } from '@/lib/supabase/client'

interface BranchContextType {
  branch: Branch
  categories: Category[]
  items: MenuItem[]
  signatures: MenuItem[]
}

const BranchContext = createContext<BranchContextType | null>(null)

export function BranchProvider({
  children,
  branch: initialBranch,
  categories,
  items,
  signatures,
}: BranchContextType & { children: ReactNode }) {
  const [realtimeOverrides, setRealtimeOverrides] = useState<Partial<Branch>>({})

  const branch = { ...initialBranch, ...realtimeOverrides }

  useEffect(() => {
    // Reset overrides when branch changes (e.g. navigation)
    setRealtimeOverrides({})
  }, [initialBranch.id])

  // NOTE: Removed on-mount fetch for is_open — the realtime subscription below
  // handles all live status updates. The initial value from SSR (initialBranch.is_open)
  // is fresh enough for the first render; realtime kicks in within ~100ms of mount.


  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`public:branches:${branch.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'branches', filter: `id=eq.${branch.id}` },
        (payload) => {
          const updatedBranch = payload.new as Partial<Branch>
          setRealtimeOverrides((prev) => ({ ...prev, ...updatedBranch }))
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [branch.id])

  return (
    <BranchContext.Provider value={{ branch, categories, items, signatures }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchData() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranchData must be used within a BranchProvider')
  }
  return context
}