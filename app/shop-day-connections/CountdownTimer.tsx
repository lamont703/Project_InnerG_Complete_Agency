"use client"

import { useEffect, useState } from "react"
import { Clock, AlertCircle } from "lucide-react"

export function CountdownTimer({ createdAt }: { createdAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isExpired, setIsExpired] = useState<boolean>(false)

  useEffect(() => {
    // 72 hours in milliseconds
    const expirationTime = new Date(createdAt).getTime() + 72 * 60 * 60 * 1000

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = expirationTime - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft("Expired")
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      
      setTimeLeft(`${hours}h ${minutes}m`)
    }

    // Initial call
    updateTimer()
    
    // Update every minute
    const intervalId = setInterval(updateTimer, 60000)

    return () => clearInterval(intervalId)
  }, [createdAt])

  // Prevent hydration mismatch by returning empty string initially if needed, 
  // but it's safe to just render since it's client-side effect
  if (!timeLeft) return <div className="text-xs text-slate-400">Calculating...</div>

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${isExpired ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
      {isExpired ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {timeLeft}
    </div>
  )
}
