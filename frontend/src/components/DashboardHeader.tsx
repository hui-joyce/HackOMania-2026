import { Bell, Settings, Search } from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardHeaderProps {
  currentUser?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export function DashboardHeader({ currentUser }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6">
      <div className="max-w-full mx-auto flex items-center justify-between gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <img src="/senticare-ai.png" alt="SentiCare AI" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-xl font-bold text-gray-800">SentiCare AI</h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {['Dashboard', 'Analytics', 'Audit'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'Dashboard'
                  ? 'border-b-2 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={tab === 'Dashboard' ? { borderColor: '#137FEC', color: '#137FEC' } : {}}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden lg:flex">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search active cases, locations, or resident IDs..."
              className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="w-6 h-6 text-gray-600" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{currentUser?.name || 'David Lee'}</p>
              <p className="text-xs text-gray-500">{currentUser?.role || 'Lead Dispatcher'}</p>
            </div>
            <img src="/david.png" alt={currentUser?.name || 'David Lee'} className="w-15 h-15 rounded-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}