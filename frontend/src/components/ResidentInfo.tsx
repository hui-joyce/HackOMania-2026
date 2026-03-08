import { MapPin, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Map } from './Map';
import { Resident } from '../types';
import { getResidentImagePath } from '../utils/imageUtils';

interface ResidentInfoProps {
  resident: Resident;
  caseStatus?: string;
  onContactFamily?: () => void;
  onViewHistory?: () => void;
}

function getStatusBadgeVariant(status?: string): 'default' | 'secondary' | 'urgent' | 'warning' | 'outline' {
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
}

function getStatusDisplay(status?: string): string {
  switch (status) {
    case 'URGENT':
      return 'URGENT';
    case 'UNCERTAIN':
      return 'UNCERTAIN';
    case 'NON-URGENT':
      return 'NON-URGENT';
    default:
      return 'Unknown';
  }
}

export function ResidentInfo({ resident, caseStatus, onContactFamily, onViewHistory }: ResidentInfoProps) {
  const residentImagePath = getResidentImagePath(resident.name);
  const displayStatus = caseStatus || resident.status || 'URGENT';

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Resident Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3 mb-2">
            <img src={residentImagePath} alt={resident.name} className="w-16 h-16 rounded-lg flex-shrink-0 object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-2 leading-snug">{resident.name}</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Age {resident.age}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(displayStatus)} className="flex-shrink-0 text-xs">
                  {getStatusDisplay(displayStatus)}
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{resident.medicalHistory}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">Address</p>
              <p className="text-xs text-gray-600 line-clamp-2">{resident.address}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">Contact</p>
              <p className="text-xs text-gray-600 break-all">{resident.phone}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onViewHistory}
              variant="outline"
              className="flex-1 text-xs h-8"
              size="sm"
            >
              History
            </Button>
            <Button
              onClick={onContactFamily}
              variant="default"
              className="flex-1 text-xs h-8"
              size="sm"
            >
              Contact
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Map Card */}
      <Card className="bg-gray-100 border-0 p-0 overflow-hidden">
        {resident.latitude !== undefined && resident.longitude !== undefined ? (
          <Map
            latitude={resident.latitude}
            longitude={resident.longitude}
            address={resident.address}
            residentName={resident.name}
          />
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-200">
            <p className="text-gray-600">Location data unavailable</p>
          </div>
        )}
      </Card>
    </div>
  );
}