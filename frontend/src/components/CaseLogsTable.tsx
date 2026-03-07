import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { CaseLog } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface CaseLogsTableProps {
  caseLogs: CaseLog[];
  filter?: 'URGENT' | 'UNCERTAIN' | 'NON-URGENT' | 'all';
}

export function CaseLogsTable({ caseLogs, filter = 'all' }: CaseLogsTableProps) {
  const [activeFilter, setActiveFilter] = useState<string>(filter);

  const filteredLogs =
    activeFilter === 'all'
      ? caseLogs
      : caseLogs.filter((log) => log.status === activeFilter);

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
    return caseLogs.filter((log) => log.status === status).length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Case Logs</CardTitle>
          <div className="flex gap-2">
            {['Active', 'Archived'].map((tab) => (
              <Button
                key={tab}
                variant={tab === 'Active' ? 'default' : 'outline'}
                size="sm"
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Buttons */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Urgent', status: 'URGENT' },
            { label: 'Uncertain', status: 'UNCERTAIN' },
            { label: 'Non-Urgent', status: 'NON-URGENT' },
          ].map((filter) => {
            const count = countByStatus(filter.status);
            const isActive = activeFilter === filter.status;
            return (
              <Button
                key={filter.status}
                onClick={() => setActiveFilter(isActive ? 'all' : filter.status)}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
              >
                {filter.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-semibold text-gray-700">CASE ID</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">TIME</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">STATUS</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">LOCATION</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">PATIENT</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">PRIMARY CONCERN</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-16">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.caseId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 font-mono text-blue-600 text-sm">{log.caseId}</td>
                  <td className="py-3 px-3 text-gray-600 text-sm">{log.time}</td>
                  <td className="py-3 px-3">
                    <Badge variant={getStatusVariant(log.status)}>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-gray-600 text-sm">{log.location}</td>
                  <td className="py-3 px-3 text-gray-600 text-sm">{log.patient}</td>
                  <td className="py-3 px-3 text-gray-600 text-sm">{log.primaryConcern}</td>
                  <td className="py-3 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}