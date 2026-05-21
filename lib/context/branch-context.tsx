'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { Branch, Category, MenuItem } from '@/lib/types'

interface BranchContextType {
  branch: Branch
  categories: Category[]
  items: MenuItem[]
  signatures: MenuItem[]   // ← added
}

const BranchContext = createContext<BranchContextType | null>(null)

export function BranchProvider({
  children,
  branch,
  categories,
  items,
  signatures,
}: BranchContextType & { children: ReactNode }) {
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