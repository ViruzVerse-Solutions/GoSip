import Link from 'next/link'
import { MdSearchOff } from 'react-icons/md'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
      <div className="text-center bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full border border-primary-100">
        <MdSearchOff className="w-20 h-20 mx-auto text-primary-600" />
        <h1 className="mt-4 text-5xl font-bold text-primary-900">404</h1>
        <p className="mt-2 text-primary-700 text-lg">
          Oops! This menu page doesn’t exist.
        </p>
        <p className="text-primary-500">
          Maybe the QR code is wrong or the link is broken.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block bg-primary-800 hover:bg-primary-900 text-white px-6 py-3 rounded-2xl shadow-lg transition"
        >
          Go to Home
        </Link>
      </div>
    </main>
  )
}