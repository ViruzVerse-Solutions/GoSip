interface QuantityControlProps {
  quantity: number
  onIncrease: (e: React.MouseEvent<HTMLButtonElement>) => void
  onDecrease: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function QuantityControl({ quantity, onIncrease, onDecrease }: QuantityControlProps) {
  return (
    <div className="flex items-center gap-2 bg-primary-500 rounded-full px-4 py-1.5 text-white font-semibold text-sm shadow-md">
      <button onClick={onDecrease} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition text-lg">−</button>
      <span className="min-w-[24px] text-center text-base">{quantity}</span>
      <button onClick={onIncrease} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition text-lg">+</button>
    </div>
  )
}