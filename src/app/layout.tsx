import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context'; // Added import
import Header from '@/components/header'; // Assuming you have a Header component
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bluesky Listings',
  description: 'A Craigslist-like platform for Bluesky users.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 container mx-auto px-4 lg:px-6 xl:px-8">
                <div className="flex flex-col lg:flex-row gap-6 py-6">
                  <div className="flex-1 min-w-0">
                    {children}
                  </div>
                </div>
              </main>
              <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      © 2024 Bluesky Listings. Built on the AT Protocol.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                      <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                      <a href="#" className="hover:text-foreground transition-colors">Support</a>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}