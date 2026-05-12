"use client"

import { Share2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ArticleActions() {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch(() => {
        // Fallback for cancellation
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="ml-auto flex gap-3">
      <Button 
        variant="outline" 
        size="icon" 
        className="rounded-full h-10 w-10 border-border"
        onClick={handleShare}
        aria-label="Share this technical brief"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        className="rounded-full h-10 w-10 border-border"
        onClick={handlePrint}
        aria-label="Print this technical brief"
      >
        <Printer className="h-4 w-4" />
      </Button>
    </div>
  )
}
