"use client"

function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;};
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);
  return null;
}
