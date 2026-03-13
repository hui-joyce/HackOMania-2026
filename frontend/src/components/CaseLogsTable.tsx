import { useState, useRef, useEffect } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { CaseLog } from '../types';
import { updateCaseStatus } from '../services/firebaseService';

interface CaseLogsTableProps {
  caseLogs: CaseLog[];
  onSelectCase?: (caseLog: CaseLog) => void;
  selectedCaseId?: string;
  filter?: 'URGENT' | 'UNCERTAIN' | 'NON-URGENT' | 'all';
}

const MIN_HEIGHT = 64; // Header only
const MID_HEIGHT = 300; // Mid position
const MAX_HEIGHT = window.innerHeight * 0.7; // 70% of viewport

export function CaseLogsTable({ 
  caseLogs, 
  onSelectCase, 
  selectedCaseId,
  filter = 'all' 
}: CaseLogsTableProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>(filter === 'all' ? [] : [filter]);
  const [activeTab, setActiveTab] = useState<'Active' | 'Archived'>('Active');
  const [drawerHeight, setDrawerHeight] = useState(MID_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [newCaseIds, setNewCaseIds] = useState<Set<string>>(new Set());
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousCaseIdsRef = useRef<Set<string>>(new Set());

  const filteredByArchive = caseLogs.filter((log) => {
    if (activeTab === 'Active') {
      return log.status !== 'RESOLVED';
    } else {
      return log.status === 'RESOLVED';
    }
  });

  const filteredLogs =
    activeFilters.length === 0
      ? filteredByArchive
      : filteredByArchive.filter((log) => activeFilters.includes(log.status));

  // Sort cases: URGENT first, then UNCERTAIN, then NON-URGENT, then RESOLVED
  // Within each status level, sort by time (most recent at bottom)
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    // Define priority order for statuses
    const statusPriority: Record<string, number> = {
      'URGENT': 0,
      'UNCERTAIN': 1,
      'NON-URGENT': 2,
      'RESOLVED': 3
    };
    
    const priorityA = statusPriority[a.status] ?? 4;
    const priorityB = statusPriority[b.status] ?? 4;
    
    // First sort by status priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Then sort by time (least recent first, most recent last)
    // Compare timestamps - newer timestamps should come after older ones
    const timeA = a.createdAt || a.time || '';
    const timeB = b.createdAt || b.time || '';
    return timeA.localeCompare(timeB);
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'URGENT':
        return 'urgent';
      case 'UNCERTAIN':
        return 'warning';
      case 'NON-URGENT':
        return 'secondary';
      case 'RESOLVED':
        return 'success';
      default:
        return 'default';
    }
  };

  const countByStatus = (status: string) => {
    return filteredByArchive.filter((log) => log.status === status).length;
  };

  const handleResolveCase = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateCaseStatus(caseId, 'RESOLVED');
      console.log('Case marked as RESOLVED:', caseId);
    } catch (error) {
      console.error('Error resolving case:', error);
    }
  };

  const handleRowClick = (caseLog: CaseLog) => {
    onSelectCase?.(caseLog);
  };

  // Detect new cases and highlight them for 5 seconds
  useEffect(() => {
    const currentCaseIds = new Set(caseLogs.map(log => log.caseId));
    const previousCaseIds = previousCaseIdsRef.current;

    // On initial load, just set the reference without highlighting
    if (previousCaseIds.size === 0) {
      previousCaseIdsRef.current = currentCaseIds;
      return;
    }

    // Find newly added cases (only cases that weren't in the previous list)
    const newlyAddedCases = caseLogs
      .filter(log => !previousCaseIds.has(log.caseId))
      .map(log => log.caseId);

    if (newlyAddedCases.length > 0) {
      // Add new case IDs to highlight set
      setNewCaseIds(prev => new Set([...prev, ...newlyAddedCases]));

      // Remove highlight after 5 seconds
      newlyAddedCases.forEach(caseId => {
        setTimeout(() => {
          setNewCaseIds(prev => {
            const updated = new Set(prev);
            updated.delete(caseId);
            return updated;
          });
        }, 5000);
      });
    }

    // Update previous case IDs ref
    previousCaseIdsRef.current = currentCaseIds;
  }, [caseLogs]);

  // Snap to nearest position
  const snapToPosition = (height: number) => {
    const positions = [MIN_HEIGHT, MID_HEIGHT, MAX_HEIGHT];
    const nearest = positions.reduce((prev, curr) =>
      Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
    );
    setDrawerHeight(nearest);
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(newHeight, MAX_HEIGHT));
      setDrawerHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      snapToPosition(drawerHeight);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, drawerHeight]);

  return (
    <div
      ref={drawerRef}
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 transition-all ${
        isDragging ? '' : 'duration-300'
      }`}
      style={{ height: `${drawerHeight}px` }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-center h-2 bg-gray-200 hover:bg-gray-300 cursor-grab active:cursor-grabbing transition-colors"
      >
        <div className="w-12 h-1 bg-gray-400 rounded-full" />
      </div>

      {/* Drawer Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            Case Logs
            <span className="text-xs font-normal text-gray-500">({filteredLogs.length})</span>
          </h3>
        </div>
        <div className="flex gap-2">
          {['Active', 'Archived'].map((tab) => (
            <Button
              key={tab}
              variant={tab === activeTab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab as 'Active' | 'Archived')}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* Drawer Content */}
      {drawerHeight > MIN_HEIGHT + 20 && (
        <div className="overflow-y-auto h-[calc(100%-70px)] px-4 py-4 bg-white">
          {/* Filter Buttons */}
          <div className="flex gap-3 flex-wrap mb-6 pb-4 border-b border-gray-200">
            {[
              { label: 'Urgent', status: 'URGENT' },
              { label: 'Non-Urgent', status: 'NON-URGENT' },
              { label: 'Uncertain', status: 'UNCERTAIN' },
            ].map((filterOption) => {
              const count = countByStatus(filterOption.status);
              const isActive = activeFilters.includes(filterOption.status);
              return (
                <Button
                  key={filterOption.status}
                  onClick={() => {
                    setActiveFilters(prev =>
                      prev.includes(filterOption.status)
                        ? prev.filter(f => f !== filterOption.status)
                        : [...prev, filterOption.status]
                    );
                  }}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                >
                  {filterOption.label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 sticky top-0 bg-white">
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">CASE ID</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">TIME</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">STATUS</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">LOCATION</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">RESIDENT</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">PRIMARY CONCERN</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 w-16">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log) => {
                  const isNewCase = newCaseIds.has(log.caseId);
                  const isSelected = selectedCaseId === log.caseId;
                  
                  return (
                  <tr
                    key={log.caseId}
                    onClick={() => handleRowClick(log)}
                    className={`cursor-pointer border-b border-gray-100 transition-all duration-300 ${
                      isSelected
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-50'
                    } ${
                      isNewCase ? 'animate-pulse' : ''
                    }`}
                    style={{ 
                      backgroundColor: isNewCase 
                        ? 'rgba(34, 197, 94, 0.15)' 
                        : isSelected 
                        ? 'rgba(19, 127, 236, 0.1)' 
                        : 'transparent',
                      borderLeft: isNewCase ? '4px solid #22c55e' : '4px solid transparent'
                    }}
                  >
                    <td className="py-3 px-3 font-mono text-sm" style={{ color: '#137FEC' }}>{log.caseId}</td>
                    <td className="py-3 px-3 text-gray-600 text-sm">{(() => {
                      const raw = (log as any).createdAt || log.time;
                      const d = new Date(raw);
                      if (isNaN(d.getTime())) return log.time;
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yyyy = d.getFullYear();
                      const hh = String(d.getHours()).padStart(2, '0');
                      const min = String(d.getMinutes()).padStart(2, '0');
                      return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
                    })()}</td>
                    <td className="py-3 px-3">
                      <Badge variant={getStatusVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-sm">{log.location}</td>
                    <td className="py-3 px-3 text-gray-600 text-sm">{log.residentName}</td>
                    <td className="py-3 px-3 text-gray-600 text-sm">{log.primaryConcern}</td>
                    <td className="py-3 px-3">
                      {activeTab === 'Active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-medium text-white px-3 py-1"
                          style={{ backgroundColor: '#10B981' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10B981')}
                          onClick={(e) => handleResolveCase(log.caseId, e)}
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500">Archived</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}