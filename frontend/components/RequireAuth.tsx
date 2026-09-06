"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getRole, isLoggedIn } from "@/lib/auth";

export default function RequireAuth({ role, children }: { role: "driver" | "admin"; children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== role) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [role, router]);

  if (!checked) return null;
  return <>{children}</>;
}
