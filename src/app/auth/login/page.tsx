'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { loginWithBsky } from '@/lib/atproto'; // No longer directly used here
import { useAuth } from '@/lib/auth-context'; // Import useAuth
import { CodeProject } from '@/components/code-project';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth(); // Use login from AuthContext
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // const result = await loginWithBsky(identifier, password); // Old way
    const result = await login(identifier, password); // New way using context

    setIsLoading(false);
    if (result.success) {
      router.push('/'); // Redirect to homepage on successful login
    } else {
      setError(result.error || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <CodeProject id="bluesky-login-page">
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign in to Bluesky Listings</CardTitle>
            <CardDescription>Enter your Bluesky handle and app password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Bluesky Handle or Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="yourhandle.bsky.social or user@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">App Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  You need to create an app password in your Bluesky settings.
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-sm">
            <p>
              Don&apos;t have an account?{' '}
              <a href="https://bsky.app" target="_blank" rel="noopener noreferrer" className="underline">
                Sign up on Bluesky
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </CodeProject>
  );
}