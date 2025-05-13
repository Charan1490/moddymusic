import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/actions/auth.actions';
import { LogOut, UserCircle } from 'lucide-react';

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    // This should ideally be caught by middleware,
    // but as a fallback, redirect here.
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="w-full max-w-lg mx-auto shadow-xl rounded-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <UserCircle size={48} className="text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">Your Profile</CardTitle>
          <CardDescription>Manage your account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 py-8">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
            <p className="text-lg text-foreground break-all">{session.email}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
            <p className="text-sm text-foreground break-all">{session.userId}</p>
          </div>
        </CardContent>
        <CardFooter>
          <form action={logoutAction} className="w-full">
            <Button type="submit" variant="destructive" className="w-full text-lg py-6">
              <LogOut className="mr-2 h-5 w-5" /> Logout
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
