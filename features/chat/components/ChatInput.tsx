import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatInputProps {
    onSend: (message: string) => void
    isLoading: boolean
    disabled: boolean
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
    const [input, setInput] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (input.trim() && !isLoading && !disabled) {
            onSend(input)
            setInput("")
        }
    }

    return (
        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <form onSubmit={handleSubmit} className="relative">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading || disabled}
                    placeholder="Ask about your infrastructure or growth strategy..."
                    className="bg-background/50 border-white/10 pr-12 h-12 rounded-xl focus:border-primary transition-all text-sm"
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || isLoading || disabled}
                    className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
            <p className="hidden md:block text-[10px] text-center text-muted-foreground mt-3 opacity-50">
                Inner G Complete Assistant can help with database queries, automation maps, and scaling audits.
            </p>
        </div>
    )
}
