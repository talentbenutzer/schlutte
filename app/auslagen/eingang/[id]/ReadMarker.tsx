"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markClaimsReadAction } from "../actions";

export function ReadMarker({ id, unread }: { id: string; unread: boolean }) {
  const done = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (!unread || done.current) return;
    done.current = true;
    void markClaimsReadAction([id]).then((result) => { if (result.ok) router.refresh(); });
  }, [id, unread, router]);
  return null;
}
