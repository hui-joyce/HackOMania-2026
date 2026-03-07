import { MapPin, Phone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Patient } from '../types';

interface PatientInfoProps {
  patient: Patient;
  onContactFamily?: () => void;
  onViewHistory?: () => void;
}

export function PatientInfo({ patient, onContactFamily, onViewHistory }: PatientInfoProps) {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Priority Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{patient.name}, {patient.age}</CardTitle>
            <Badge variant="urgent">{patient.priority}</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">{patient.medicalHistory}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-sm text-gray-600">{patient.address}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Contact</p>
              <p className="text-sm text-gray-600">{patient.phone}</p>
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
      <Card className="bg-gray-100 border-0">
        <div className="rounded-lg h-48 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Map View</p>
            {patient.latitude && patient.longitude && (
              <p className="text-xs text-gray-500 mt-1">
                {patient.latitude.toFixed(4)}, {patient.longitude.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Ambulance ETA Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="flex items-center gap-3 pt-6">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-600 font-medium">Ambulance ETA</p>
            <p className="text-sm font-semibold text-blue-700">4m 12s</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}