import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context'; // Added import
import Header from '@/components/header'; // Assuming you have a Header component

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
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> {/* Added AuthProvider wrapper */}
            <Header />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            {/* You can add a Footer component here if needed */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}