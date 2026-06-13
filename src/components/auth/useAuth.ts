'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authAPI } from '@/lib/api';

export type AdminUser = {
  is_admin: boolean;
  admin?: { id: number; email: string; username: string };
};

/**
 * Side-effect-only auth gate. Call this once at the top of any admin page.
 *
 * Behavior:
 *  - Reads the JWT from localStorage and probes /api/auth/me/.
 *  - If absent or non-admin, redirects to /auth/login (preserving `next`).
 *  - If valid, returns the admin user and a `ready: true` flag.
 */
export function useRequireAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access') : null;
    if (!token) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    authAPI.me()
      .then((res) => {
        if (cancelled) return;
        if (!res.data?.is_admin) {
          localStorage.removeItem('admin_access');
          localStorage.removeItem('admin_refresh');
          router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setUser(res.data);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      });
    return () => { cancelled = true; };
  }, [router, pathname]);

  return { user, ready };
}
