import { Bell, Settings, Search, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { getResidentImagePath } from '../utils/imageUtils';
import { subscribeToCases } from '../services/firebaseService';
import { CaseLog } from '../types';

interface Notification {
  id: string;
  caseId: string;
  residentName: string;
  status: string;
  caseTime: string; // formatted case time
  caseDate: Date; // raw case date for sorting
  time: Date;
  read: boolean;
  priority: number; // 0 = URGENT, 1 = NON-URGENT, 2 = UNCERTAIN
}

interface DashboardHeaderProps {
  currentUser?: {
    name: string;
    role: string;
    avatar?: string;
  };
  hideSearch?: boolean;
}

export function DashboardHeader({ currentUser, hideSearch = false }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userImagePath = currentUser?.avatar || getResidentImagePath(currentUser?.name || 'David Lee');

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('senticare_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((n: any) => ({ ...n, time: new Date(n.time), caseDate: new Date(n.caseDate) }));
      }
    } catch { /* ignore */ }
    return [];
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const casesRef = useRef<CaseLog[]>([]);
  const resolvedIdsRef = useRef<Set<string>>((() => {
    try {
      const stored = localStorage.getItem('senticare_resolved_ids');
      if (stored) return new Set<string>(JSON.parse(stored));
    } catch { /* ignore */ }
    return new Set<string>();
  })());

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('senticare_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Subscribe to cases and generate notifications every 10 minutes for unresolved ones
  useEffect(() => {
    let intervalId: number;

    const generateNotifications = () => {
      const unresolved = casesRef.current.filter(
        (c) => c.status !== 'RESOLVED' && !resolvedIdsRef.current.has(c.caseId)
      );
      if (unresolved.length === 0) return;

      const getPriority = (status: string) => {
        if (status === 'URGENT') return 0;
        if (status === 'NON-URGENT') return 1;
        return 2;
      };

      // Sort oldest unresolved first (by case creation time)
      const sorted = [...unresolved].sort((a, b) => {
        const dateA = new Date((a as any).createdAt || a.time).getTime();
        const dateB = new Date((b as any).createdAt || b.time).getTime();
        return dateA - dateB;
      });

      const newNotifs: Notification[] = sorted.map((c) => {
        // Format case time from createdAt
        const raw = (c as any).createdAt || c.time;
        const d = new Date(raw);
        const caseTime = isNaN(d.getTime()) ? c.time : `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        return {
          id: `${c.caseId}-${Date.now()}`,
          caseId: c.caseId,
          residentName: c.residentName,
          status: c.status,
          caseTime,
          caseDate: isNaN(d.getTime()) ? new Date() : d,
          time: new Date(),
          read: false,
          priority: getPriority(c.status),
        };
      });

      setNotifications((prev) => {
        // Preserve read state from existing notifications
        const readIds = new Set(prev.filter((n) => n.read).map((n) => n.caseId));
        const merged = newNotifs.map((n) => readIds.has(n.caseId) ? { ...n, read: true } : n);
        return [...merged, ...prev].slice(0, 50);
      });
    };

    const unsubscribe = subscribeToCases((cases) => {
      const prevCases = casesRef.current;
      casesRef.current = cases;

      // Track newly resolved cases — stop notifying for them
      cases.forEach((c) => {
        if (c.status === 'RESOLVED') {
          resolvedIdsRef.current.add(c.caseId);
        }
      });
      localStorage.setItem('senticare_resolved_ids', JSON.stringify([...resolvedIdsRef.current]));

      // Generate initial notifications on first load
      if (prevCases.length === 0 && cases.length > 0) {
        generateNotifications();
      }
    });

    // Generate reminder notifications every 10 minutes
    intervalId = window.setInterval(generateNotifications, 10 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const tabs = [
    { name: 'Dashboard', path: '/' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Audit', path: '/audit' },
  ];

  const getCurrentTab = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/analytics') return 'Analytics';
    if (location.pathname === '/audit') return 'Audit';
    return 'Dashboard';
  };

  const currentTab = getCurrentTab();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-full mx-auto flex items-center px-6 py-4 gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <img src="/senticare-ai.png" alt="SentiCare AI" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-xl font-bold text-gray-800">SentiCare AI</h1>
        </div>

        {/* Navigation Tabs - Prominent on the left */}
        <nav className="flex items-center gap-0 border-l border-gray-200 pl-4 ml-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                currentTab === tab.name
                  ? 'text-white'
                  : 'text-gray-600 hover:text-gray-800 border-transparent'
              }`}
              style={currentTab === tab.name ? { borderColor: '#137FEC', color: '#137FEC' } : {}}
            >
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Bar */}
        {!hideSearch && (
          <div className="hidden lg:block">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search active cases, locations, or resident IDs..."
                className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-4 ml-4">
          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Bell className="w-6 h-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {showDropdown && (
              <div className="absolute right-0 top-12 w-[22rem] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[32rem] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200" style={{ backgroundColor: '#f0f7ff' }}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" style={{ color: '#137FEC' }} />
                    <span className="text-sm font-bold text-gray-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5" style={{ backgroundColor: '#137FEC' }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs font-semibold hover:underline" style={{ color: '#137FEC' }}>
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const accent = n.status === 'URGENT' ? '#EF4444' : n.status === 'UNCERTAIN' ? '#F59E0B' : '#137FEC';
                      // Compute how long the case has been unresolved
                      const unresolvedMs = Date.now() - n.caseDate.getTime();
                      const unresolvedMins = Math.floor(unresolvedMs / 60000);
                      const unresolvedStr = unresolvedMins < 1 ? 'Unresolved for <1m'
                        : unresolvedMins < 60 ? `Unresolved for ${unresolvedMins}m`
                        : unresolvedMins < 1440 ? `Unresolved for ${Math.floor(unresolvedMins / 60)}h ${unresolvedMins % 60}m`
                        : `Unresolved for ${Math.floor(unresolvedMins / 1440)}d ${Math.floor((unresolvedMins % 1440) / 60)}h`;
                      const cardBg = !n.read
                        ? n.status === 'URGENT' ? 'bg-red-50' : n.status === 'UNCERTAIN' ? 'bg-amber-50' : 'bg-blue-50/40'
                        : 'bg-white';
                      return (
                        <div
                          key={n.id}
                          className={`rounded-lg border transition-all hover:shadow-sm cursor-pointer ${cardBg} ${!n.read ? 'border-gray-200' : 'border-gray-100'}`}
                          style={{ borderLeft: `4px solid ${accent}` }}
                          onClick={() => {
                            setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
                            setShowDropdown(false);
                            navigate('/', { state: { selectedCaseId: n.caseId } });
                          }}
                        >
                          <div className="px-3 py-2.5">
                            {/* Row 1: Status badge + time ago + dismiss */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={n.status === 'URGENT' ? 'urgent' : n.status === 'UNCERTAIN' ? 'warning' : 'secondary'}
                                  className="text-[10px] px-1.5 py-0 font-bold"
                                >
                                  {n.status}
                                </Badge>
                                {!n.read && (
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#137FEC' }} />
                                )}
                              </div>
                              <button
                                className="text-gray-300 hover:text-gray-500 p-0.5 rounded hover:bg-gray-100"
                                onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Row 2: Case ID */}
                            <p className="text-xs font-bold font-mono" style={{ color: '#137FEC' }}>{n.caseId}</p>
                            {/* Row 3: Resident name + case date */}
                            <p className="text-xs font-medium text-gray-800 mt-0.5">{n.residentName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{n.caseTime}</p>
                            {/* Row 4: Unresolved duration + notification age */}
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] font-medium" style={{ color: accent }}>{unresolvedStr}</p>
                              <p className="text-[10px] text-gray-400">{formatTimeAgo(n.time)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="w-6 h-6 text-gray-600" />
          </Button>

          {/* Reset Database Button (Developer/Internal Tooling) */}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-white bg-red-500 hover:bg-red-600 border-none px-3"
            onClick={async () => {
              if (window.confirm('Are you sure you want to clear all data and reseed? This cannot be undone.')) {
                try {
                  const { clearAndReseedData } = await import('../services/firebaseService');
                  await clearAndReseedData();
                  window.location.reload();
                } catch (err) {
                  alert('Failed to reseed: ' + err);
                }
              }
            }}
          >
            Reset DB
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{currentUser?.name || 'David Lee'}</p>
              <p className="text-xs text-gray-500">{currentUser?.role || 'Lead Dispatcher'}</p>
            </div>
            <img src={userImagePath} alt={currentUser?.name || 'David Lee'} className="w-15 h-15 rounded-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}