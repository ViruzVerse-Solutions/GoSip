export default function AddButton({ onClick, className = '' }: { onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center min-h-[36px] px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg hover:bg-primary-700 ${className}`}
    >
      + Add
    </button>
  )
}