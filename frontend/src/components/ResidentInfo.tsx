import { MapPin, Phone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Map } from './Map';
import { Resident } from '../types';

interface ResidentInfoProps {
  resident: Resident;
  onContactFamily?: () => void;
  onViewHistory?: () => void;
}

export function ResidentInfo({ resident, onContactFamily, onViewHistory }: ResidentInfoProps) {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Priority Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4 justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <img src="/pauline-goh.png" alt={resident.name} className="w-25 h-25 flex-shrink-0" />
              <CardTitle className="text-xl">{resident.name}, {resident.age}</CardTitle>
            </div>
            <Badge variant="urgent" className="flex-shrink-0">{resident.priority}</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">{resident.medicalHistory}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-sm text-gray-600">{resident.address}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Contact</p>
              <p className="text-sm text-gray-600">{resident.phone}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onViewHistory}
              variant="outline"
              className="flex-1"
            >
              View History
            </Button>
            <Button
              onClick={onContactFamily}
              variant="default"
              className="flex-1"
            >
              Contact Family
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

      {/* Ambulance ETA Card */}
      <Card style={{ backgroundColor: '#EBF4FF', borderColor: '#137FEC' }} className="border-2 p-0 overflow-hidden">
        <CardContent className="flex items-center gap-3 pt-6">
          <Clock className="w-5 h-5 flex-shrink-0" style={{ color: '#137FEC' }} />
          <div>
            <p className="text-xs text-gray-600 font-medium">Ambulance ETA</p>
            <p className="text-sm font-semibold" style={{ color: '#137FEC' }}>4m 12s</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}