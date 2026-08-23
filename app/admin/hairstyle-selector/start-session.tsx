"use client";

import { useRouter } from "next/navigation";
import { NewSessionButton } from "@/components/admin/hairstyle-selector";
import { startSession } from "./actions";

export function StartSession() {
  const router = useRouter();
  return (
    <NewSessionButton
      onStart={async (name) => {
        const r = await startSession(name);
        if (r.ok && r.id) router.push(`/admin/hairstyle-selector?session=${r.id}`);
      }}
    />
  );
}
