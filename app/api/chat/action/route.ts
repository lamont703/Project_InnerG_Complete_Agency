import { NextResponse } from 'next/server';
import { currentMember, appendToThread } from '@/lib/member-context';
import { getViewAsContext } from '@/lib/account/view-as';
import { confirmAction } from '@/lib/chat/account-tools';

/**
 * The site chat's Confirm button (lib/chat/account-tools.ts). The model asked
 * for something that changes the member's account — a booking, a cancellation,
 * a publish — and it ran nothing; this runs it, now that the member has said yes.
 *
 * Only for the member whose session this is, and never while an admin is
 * viewing as someone: pressing Confirm there would act as that member.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const viewAs = await getViewAsContext();
  if (viewAs?.viewingAs) return NextResponse.json({ ok: false, error: "Actions are switched off while viewing as someone." }, { status: 403 });
  const member = await currentMember();
  if (!member) return NextResponse.json({ ok: false, error: 'Sign in to do that.' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const res = await confirmAction(String(b?.token || ''), member.id, new URL(req.url).origin);
  if (!res.ok) return NextResponse.json(res, { status: 409 });

  // Into the member's thread, so the next message knows it happened.
  await appendToThread(member.id, `[Confirmed in chat: ${res.title}]`, res.text).catch(() => {});
  return NextResponse.json({ ok: true, text: res.text });
}
