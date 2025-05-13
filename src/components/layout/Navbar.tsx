import { Music2 } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Music2 size={28} />
          <h1 className="text-2xl font-bold tracking-tight">Moodify Music</h1>
        </Link>
      </div>
    </nav>
  );
}
