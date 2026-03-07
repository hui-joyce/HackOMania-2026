import { useState, useRef, useEffect } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { CaseLog } from '../types';

interface CaseLogsTableProps {
  caseLogs: CaseLog[];
  onSelectCase?: (caseLog: CaseLog) => void;
  selectedCaseId?: string;
  filter?: 'URGENT' | 'UNCERTAIN' | 'NON-UNCERTAIN' | 'all';
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
  const [archivedCaseIds, setArchivedCaseIds] = useState<Set<string>>(new Set());
  const [drawerHeight, setDrawerHeight] = useState(MID_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const filteredByArchive = caseLogs.filter((log) => {
    if (activeTab === 'Active') {
      return !archivedCaseIds.has(log.caseId);
    } else {
      return archivedCaseIds.has(log.caseId);
    }
  });

  const filteredLogs =
    activeFilters.length === 0
      ? filteredByArchive
      : filteredByArchive.filter((log) => activeFilters.includes(log.status));

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'URGENT':
        return 'urgent';
      case 'UNCERTAIN':
        return 'warning';
      case 'NON-URGENT':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const countByStatus = (status: string) => {
    return filteredByArchive.filter((log) => log.status === status).length;
  };

  const handleResolveCase = (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArchivedCaseIds(prev => new Set(prev).add(caseId));
  };

  const handleRowClick = (caseLog: CaseLog) => {
    onSelectCase?.(caseLog);
  };

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
              { label: 'Uncertain', status: 'UNCERTAIN' },
              { label: 'Non-Urgent', status: 'NON-URGENT' },
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
                {filteredLogs.map((log) => (
                  <tr
                    key={log.caseId}
                    onClick={() => handleRowClick(log)}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      selectedCaseId === log.caseId
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                    style={{ backgroundColor: selectedCaseId === log.caseId ? 'rgba(19, 127, 236, 0.1)' : 'transparent' }}
                  >
                    <td className="py-3 px-3 font-mono text-sm" style={{ color: '#137FEC' }}>{log.caseId}</td>
                    <td className="py-3 px-3 text-gray-600 text-sm">{log.time}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}