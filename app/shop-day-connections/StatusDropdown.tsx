"use client"

import { useTransition } from "react"
import { updateConnectionStatus } from "./actions"
import { Loader2 } from "lucide-react"

type StatusDropdownProps = {
  id: string
  type: "invite" | "request"
  currentStatus: string
}

export function StatusDropdown({ id, type, currentStatus }: StatusDropdownProps) {
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    startTransition(async () => {
      try {
        await updateConnectionStatus(id, type, newStatus)
      } catch (err) {
        alert("Failed to update status. Please try again.")
      }
    })
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    "1st_contact": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    "2nd_contact": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800",
    "3rd_contact": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    declined: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  }

  const defaultColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentStatus.toLowerCase()}
        onChange={handleStatusChange}
        disabled={isPending}
        className={`appearance-none pl-3 pr-8 py-1 text-xs font-semibold rounded-full border outline-none cursor-pointer transition-colors ${statusColors[currentStatus.toLowerCase()] || defaultColor} disabled:opacity-50`}
      >
        <option value="pending">Pending</option>
        <option value="1st_contact">1st Msg Sent</option>
        <option value="2nd_contact">2nd Msg Sent</option>
        <option value="3rd_contact">3rd Msg Sent</option>
        <option value="accepted">Accepted</option>
        <option value="declined">Declined</option>
        <option value="scheduled">Scheduled</option>
      </select>
      {isPending ? (
        <Loader2 className="absolute right-2 w-3 h-3 animate-spin text-slate-500" />
      ) : (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      )}
    </div>
  )
}
