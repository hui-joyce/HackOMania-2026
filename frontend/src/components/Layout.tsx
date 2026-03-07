import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold border-b-2 border-transparent bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 inline-block">
            SentiCare
          </h1>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        {children}
      </main>
      <footer className="bg-white py-4 text-center text-gray-500 text-sm border-t border-gray-100">
        &copy; {new Date().getFullYear()} SentiCare. All rights reserved.
      </footer>
    </div>
  );
}
