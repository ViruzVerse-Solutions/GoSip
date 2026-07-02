import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET /api/session?branch=[branchSlug]
// Verify if the session cookie is active and return the session details
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchSlug = searchParams.get('branch')

  if (!branchSlug) {
    return NextResponse.json({ active: false, error: 'Missing branch parameter' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(`gosip-session-${branchSlug}`)?.value
  const table = cookieStore.get(`gosip-table-${branchSlug}`)?.value

  if (token && table) {
    return NextResponse.json({ active: true, sessionToken: token, table })
  }

  return NextResponse.json({ active: false })
}

// POST /api/session
// Set the HttpOnly session token and table selection cookies
export async function POST(req: Request) {
  try {
    const { table, branchSlug } = await req.json()

    if (!table || !branchSlug) {
      return NextResponse.json({ error: 'Missing table or branchSlug' }, { status: 400 })
    }

    const token = crypto.randomUUID()
    const cookieStore = await cookies()

    // 1. Secure HttpOnly session cookie (unreadable by client JavaScript)
    cookieStore.set(`gosip-session-${branchSlug}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 2 * 60 * 60, // 2 hours (aligned with order TTL)
    })

    // 2. Table number cookie (so client knows which table is active)
    cookieStore.set(`gosip-table-${branchSlug}`, table, {
      httpOnly: false, // client JS can read this for display
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 2 * 60 * 60,
    })

    return NextResponse.json({ success: true, sessionToken: token, table })
  } catch (err) {
    console.error('[Session API] Error:', err)
    return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 })
  }
}

// DELETE /api/session
// Clear the session and table cookies
export async function DELETE(req: Request) {
  try {
    const { branchSlug } = await req.json()

    if (!branchSlug) {
      return NextResponse.json({ error: 'Missing branchSlug' }, { status: 400 })
    }

    const cookieStore = await cookies()
    cookieStore.delete(`gosip-session-${branchSlug}`)
    cookieStore.delete(`gosip-table-${branchSlug}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Session API] Delete failed:', err)
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 })
  }
}
