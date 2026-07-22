import { fetchPinterestQueue } from "./actions"
import { PinCard } from "@/components/pinterest-queue/pin-card"
import { Navbar } from "@/components/layout/navbar"
export const metadata = {
  title: "Pinterest Queue | Inner G Complete",
  description: "Generated Pinterest pins ready to post via GoHighLevel.",
}

export const dynamic = "force-dynamic"

export default async function PinterestQueuePage() {
  const pending = await fetchPinterestQueue("pending")

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow p-8 md:p-12 lg:p-24">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Pinterest Pin Queue</h1>
          <p className="text-slate-500 max-w-2xl">
            Generated from real platform data by <code className="bg-slate-200 px-1.5 py-0.5 rounded text-sm">scripts/generate_pinterest_pins.js</code>.
            Copy each field into GoHighLevel&apos;s Pinterest composer (Title / Link / select the matching board), then mark it posted so it
            drops off this list.
          </p>
        </header>

        {pending.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            No pins waiting to be posted. Run <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">node scripts/generate_pinterest_pins.js</code> to
            generate more.
          </div>
        ) : (
          <div className="flex flex-col gap-5 max-w-4xl">
            {pending.map((pin) => (
              <PinCard key={pin.id} pin={pin} />
            ))}
          </div>
        )}
      </div>

    </main>
  )
}
