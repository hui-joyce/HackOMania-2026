import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/audio', label: '🎧 Audio Analysis' },
  { to: '/pab-demo', label: '🚨 PAB Demo' },
];

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Only show this header if not on dashboard or analytics */}
      {pathname !== '/' && pathname !== '/analytics' && (
        <header className="bg-white shadow-sm py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <h1 className="text-xl font-bold border-b-2 border-transparent bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 inline-block">
              SentiCare
            </h1>
            <nav className="flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    pathname === link.to
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      )}
      <main className="flex-grow">
        {children}
      </main>
      {pathname !== '/' && pathname !== '/analytics' && (
        <footer className="bg-white py-4 text-center text-gray-500 text-sm border-t border-gray-100">
          &copy; {new Date().getFullYear()} SentiCare. All rights reserved.
        </footer>
      )}
    </div>
  );
}