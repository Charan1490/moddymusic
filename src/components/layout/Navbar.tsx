import { Music2, User, LogIn, LogOut, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/actions/auth.actions';

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Music2 size={28} />
          <h1 className="text-2xl font-bold tracking-tight">Moodify Music</h1>
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Button variant="ghost" asChild className="hover:bg-primary/80 text-primary-foreground px-3 py-2">
                <Link href="/profile" className="flex items-center gap-1.5 text-sm">
                  <User size={18} />
                  Profile
                </Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm" className="hover:bg-primary/80 text-primary-foreground px-3 py-2 flex items-center gap-1.5 text-sm">
                  <LogOut size={18} />
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hover:bg-primary/80 text-primary-foreground px-3 py-2">
                <Link href="/login" className="flex items-center gap-1.5 text-sm">
                  <LogIn size={18} />
                  Login
                </Link>
              </Button>
              <Button variant="ghost" asChild className="hover:bg-primary/80 text-primary-foreground px-3 py-2">
                 <Link href="/signup" className="flex items-center gap-1.5 text-sm">
                  <UserPlus size={18} />
                  Sign Up
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
