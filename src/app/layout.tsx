import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import Navbar from '@/components/Navbar/page';
import Footer from '@/components/Footer/page';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'User Organiser',
  description: 'A modern app for organizing users and events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-900`}>
          <Providers>
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: '',
                duration: 5000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                },
                error: {
                  duration: 4000,
                }
              }}
            />
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </Providers>
          {/* 
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `
                var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
                (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/682e49ee8ec535190f1216aa/1irqd1j70';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
                })();
              `
            }}
          />  */}
      </body>
    </html>
  );
}
