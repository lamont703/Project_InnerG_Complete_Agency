import { fetchConnections } from "./actions"
import { StatusDropdown } from "./StatusDropdown"
import { CountdownTimer } from "./CountdownTimer"
import { Users, Link as LinkIcon, Calendar, Store, Scissors } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export const metadata = {
  title: "Shop Day Connections | Inner G Complete",
  description: "Manage invites and requests between Barbers and Barbershops.",
}

export const dynamic = 'force-dynamic'

export default async function ShopDayConnectionsPage() {
  const { invites, requests } = await fetchConnections()

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      <Navbar />
      
      <div className="flex-grow p-8 md:p-12 lg:p-24">
        {/* Header */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <LinkIcon className="w-4 h-4" />
            Connection Manager
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
            Shop Day <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Connections</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
            Master control panel for tracking and updating the status of all Barber and Barbershop matchmaking connections.
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-600 dark:text-slate-400">Total Shop Invites</h3>
            </div>
            <p className="text-4xl font-black">{invites.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-600 dark:text-slate-400">Total Barber Requests</h3>
            </div>
            <p className="text-4xl font-black">{requests.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Outbound Invites (Shops -> Barbers) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Outbound Invites</h2>
              </div>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 font-medium">Shops → Barbers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-4 px-6 font-medium">Shop Details</th>
                    <th className="py-4 px-6 font-medium">Invited Barber</th>
                    <th className="py-4 px-6 font-medium">Date</th>
                    <th className="py-4 px-6 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invites.length > 0 ? invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{invite.shop_name}</div>
                        <div className="text-xs text-slate-500 mt-1">{invite.shop_phone}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{invite.professionals_name}</div>
                        <div className="text-xs text-slate-500 mt-1">{invite.professionals_phone_number}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-500 text-xs mb-1.5">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </div>
                        {!["accepted", "declined", "scheduled"].includes(invite.status) && <CountdownTimer createdAt={invite.created_at} />}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <StatusDropdown id={invite.id} type="invite" currentStatus={invite.status} />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        No outbound invites found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inbound Requests (Barbers -> Shops) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Inbound Requests</h2>
              </div>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 font-medium">Barbers → Shops</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-4 px-6 font-medium">Requesting Barber</th>
                    <th className="py-4 px-6 font-medium">Requested Shop</th>
                    <th className="py-4 px-6 font-medium">Date</th>
                    <th className="py-4 px-6 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {requests.length > 0 ? requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{req.professionals_name}</div>
                        <div className="text-xs text-slate-500 mt-1">{req.professionals_phone_number}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{req.shop_name}</div>
                        <div className="text-xs text-slate-500 mt-1">{req.shop_phone}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-500 text-xs mb-1.5">
                          {new Date(req.created_at).toLocaleDateString()}
                        </div>
                        {!["accepted", "declined", "scheduled"].includes(req.status) && <CountdownTimer createdAt={req.created_at} />}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <StatusDropdown id={req.id} type="request" currentStatus={req.status} />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        No inbound requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      
      <Footer />
    </main>
  )
}
