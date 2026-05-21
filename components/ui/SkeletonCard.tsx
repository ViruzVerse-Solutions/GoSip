export default function SkeletonCard() {
  return (
    <div className="flex h-[88px] sm:h-24 bg-white rounded-xl overflow-hidden border border-gray-100">
      {/* Image placeholder */}
      <div className="w-20 sm:w-24 h-full skeleton" />

      {/* Content placeholder */}
      <div className="flex-1 flex flex-col justify-center px-3 py-1 space-y-2">
        {/* Name line */}
        <div className="h-4 w-3/4 rounded-md skeleton" />
        {/* Price line (shorter) */}
        <div className="h-4 w-1/3 rounded-md skeleton" />
      </div>
    </div>
  )
}