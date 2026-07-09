import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { NearbyEntity } from "@/lib/nearby-entities";

interface NearbyEntitiesSectionProps {
  title: string;
  icon: LucideIcon;
  entities: NearbyEntity[];
}

// Server-renderable (no client state) so it contributes real, crawlable
// <a> links to the page — not a client-fetched island search engines and
// LLM crawlers might not execute JS to see.
export function NearbyEntitiesSection({ title, icon: Icon, entities }: NearbyEntitiesSectionProps) {
  if (entities.length === 0) return null;

  return (
    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="space-y-1.5">
        {entities.map((e) => (
          <Link
            key={e.id}
            href={e.profileUrl}
            className="flex items-center justify-between text-xs hover:bg-slate-100 -mx-1 px-1 py-0.5 rounded transition-colors"
          >
            <span className="text-slate-700 font-semibold truncate pr-2 hover:text-primary hover:underline">{e.name}</span>
            <span className="font-black shrink-0 text-slate-500">
              {e.subtitle ? `${e.subtitle} · ` : ""}
              {e.distanceMiles.toFixed(1)}mi
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
