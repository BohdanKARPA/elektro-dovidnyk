import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { parseBody } from 'next-sanity/webhook'

/**
 * Sanity webhook → on-demand ISR.
 * Webhook settings: trigger on create/update/delete, projection {_type},
 * secret = SANITY_REVALIDATE_SECRET. The HMAC signature is verified by parseBody.
 */
export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(req, process.env.SANITY_REVALIDATE_SECRET, true)
    if (!isValidSignature) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
    if (!body?._type) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

    revalidateTag(body._type, { expire: 0 })
    return NextResponse.json({ revalidated: body._type, now: Date.now() })
  } catch (err) {
    console.error('[revalidate]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
