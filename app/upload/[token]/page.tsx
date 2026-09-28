import { Navbar } from "@/components/layout/navbar";
import { peekUploadSession } from "@/lib/mcp/photo-upload";
import { McpPhotoUploadForm } from "@/components/account/mcp-photo-upload-form";

/**
 * The fallback for the in-chat upload box: the same one-time upload, as a page.
 *
 * Reached from the link upload_photo gives Claude to hand the owner — when the
 * host does not render MCP Apps, or the box could not reach shearquery.com.
 * No login: the token in the URL is the credential, it lasts 30 minutes, it
 * takes one photo, and all it can make is a draft the owner still has to
 * approve. Asking a barber on their phone to sign in to a site they rarely
 * visit, to finish something they started in Claude, is where this would stall.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add a photo | ShearQuery",
  robots: { index: false, follow: false },
};

export default async function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await peekUploadSession(token);

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-lg px-5 pt-28 pb-20 sm:px-6">
        <h1 className="text-2xl font-black tracking-tight">Add a photo to your Google listing</h1>
        {session.ok ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              It&apos;s saved as a draft first. Nothing goes on Google until you approve it in Claude.
            </p>
            <div className="mt-6">
              <McpPhotoUploadForm token={token} initialCategory={session.category} />
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
            {session.message}
          </div>
        )}
      </main>
    </div>
  );
}
