import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Download, Share2, AlertTriangle, User, FileText, ChevronDown, Zap, Sparkles, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DashboardHeader } from '../components/DashboardHeader';
import { Map } from '../components/Map';
import { fetchCaseById, fetchResidentById } from '../services/firebaseService';
import { CaseLog, Resident } from '../types';

type ReceiverType = 'police' | 'ambulance' | 'community-responders' | 'welfare-helpers';

interface ReceiverOption {
  id: ReceiverType;
  label: string;
  aiRecommended: boolean;
}

export function IncidentReport() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [selectedReceivers, setSelectedReceivers] = useState<ReceiverType[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [caseData, setCaseData] = useState<CaseLog | null>(null);
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const receiverOptions: ReceiverOption[] = [
    { id: 'ambulance', label: 'Ambulance', aiRecommended: true },
    { id: 'police', label: 'Police', aiRecommended: false },
    { id: 'community-responders', label: 'Community Responders', aiRecommended: true },
    { id: 'welfare-helpers', label: 'Welfare Helpers', aiRecommended: false },
  ];

  const toggleReceiver = (receiverId: ReceiverType) => {
    setSelectedReceivers(prev =>
      prev.includes(receiverId)
        ? prev.filter(id => id !== receiverId)
        : [...prev, receiverId]
    );
    setShowValidation(false);
  };

  const handleTransmit = () => {
    if (selectedReceivers.length === 0) {
      setShowValidation(true);
      return;
    }
    console.log('Transmitting to dispatch units:', selectedReceivers);
    // Handle transmission logic
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Fetch case and resident data
  useEffect(() => {
    const fetchData = async () => {
      if (!caseId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Decode the caseId if it was URL encoded
        const decodedCaseId = decodeURIComponent(caseId);
        
        // Fetch case data
        const fetchedCase = await fetchCaseById(decodedCaseId);
        if (!fetchedCase) {
          setError('Case not found');
          setLoading(false);
          return;
        }
        setCaseData(fetchedCase);
        
        // Fetch resident data using residentId from case
        const fetchedResident = await fetchResidentById(fetchedCase.residentId);
        if (!fetchedResident) {
          setError('Resident not found');
          setLoading(false);
          return;
        }
        setResident(fetchedResident);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching incident report data:', err);
        setError('Failed to load incident report');
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  const priorityColors = {
    'PRIORITY I': 'bg-red-500',
    'PRIORITY II': 'bg-orange-500',
    'PRIORITY III': 'bg-yellow-500',
  };

  const getSeverityColor = (score: number) => {
    if (score >= 9) return 'text-red-600';
    if (score >= 7) return 'text-orange-600';
    return 'text-yellow-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader hideSearch={true} />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">Loading incident report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData || !resident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader hideSearch={true} />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/', { state: { selectedCaseId: caseId } })}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold">{error || 'Case not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parse medical history if it's a string
  const medicalHistoryArray = typeof resident.medicalHistory === 'string' 
    ? resident.medicalHistory.split(',').map(item => item.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader hideSearch={true} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/', { state: { selectedCaseId: caseId } })}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Title Card */}
        <Card className="mb-6 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={`${priorityColors[resident.priority]} text-white px-3 py-1 text-sm font-bold`}>
                    {resident.priority}
                  </Badge>
                  <span className="text-sm font-medium text-gray-600">
                    Case ID: #{caseId || '2948-AX'}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Incident Report</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {caseData.primaryConcern || 'Emergency Response'} - Active Response
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2 justify-end">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dispatch Timestamp</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(caseData.time).toLocaleString('en-SG', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Singapore'
                  })} SGT
                </p>
                <Button variant="link" size="sm" className="text-blue-600 mt-1">
                  View Protocol
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <User className="w-5 h-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                    <p className="text-sm font-semibold text-gray-900">{resident.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Age / Gender</p>
                    <p className="text-sm font-semibold text-gray-900">{resident.age} / Female</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ID Number</p>
                    <p className="text-sm font-semibold text-gray-900">S1234567E</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Blood Type</p>
                    <p className="text-sm font-semibold text-gray-900">O-Positive (O+)</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Medical History</p>
                  </div>
                  <div className="space-y-2">
                    {medicalHistoryArray.length > 0 ? (
                      medicalHistoryArray.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <p className="text-sm text-gray-700">{item}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No medical history recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exact Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <MapPin className="w-5 h-5" />
                Exact Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Primary Address</p>
                  <p className="text-sm font-semibold text-gray-900">{resident.address}</p>
                  <p className="text-sm text-gray-600">Singapore, {resident.postalCode || '088003'}</p>
                </div>

                {/* Interactive Map */}
                <div className="w-full h-48">
                  <Map
                    latitude={resident.latitude}
                    longitude={resident.longitude}
                    address={resident.address}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Incident Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <FileText className="w-5 h-5" />
                AI Incident Analysis
              </CardTitle>
              <Badge className="bg-blue-500 text-white px-3 py-1">Live Analysis</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Severity Score</p>
                <div className={`text-4xl font-bold ${getSeverityColor(9.4)}`}>
                  9.4<span className="text-2xl">/10</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Critical Condition Detected</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">ETA / EMS Unit</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600">3.5</span>
                  <span className="text-xl font-semibold text-blue-600">MIN</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Nearest Unit: 025-260</p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-800 leading-relaxed italic">
                "AI Voice Analysis all 995 call indicates high respiratory distress and verbal cues consistent with myocardial infarction. 
                Immediate ACLS intervention recommended upon arrival."
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dispatcher Note */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900 mb-1">Dispatcher Note:</p>
              <p className="text-sm text-yellow-800">
                Patient's spouse is on-site performing bystander CPR. Access via service entrance requested.
              </p>
            </div>
          </div>
        </div>

        {/* Transmit Button */}
        <div className="space-y-4">
          <div className="flex items-stretch gap-3">
            <Button
              className={`flex-1 ${
                selectedReceivers.length === 0
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } px-8 py-6 text-lg font-semibold rounded-lg shadow-lg flex items-center justify-center gap-3`}
              onClick={handleTransmit}
            >
              <Zap className="w-6 h-6" />
              TRANSMIT TO DISPATCH UNITS
            </Button>
            
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                className="h-full px-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Select Dispatch Recipients</p>
                    <div className="space-y-2">
                      {receiverOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedReceivers.includes(option.id)}
                              onChange={() => toggleReceiver(option.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900">{option.label}</span>
                          </div>
                          {option.aiRecommended && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showValidation && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700 font-medium">
                Please select at least one dispatch recipient before transmitting
              </p>
            </div>
          )}

          {selectedReceivers.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Dispatching to:</span>
              {selectedReceivers.map((receiverId) => {
                const option = receiverOptions.find(o => o.id === receiverId);
                return (
                  <Badge key={receiverId} className="bg-blue-600 text-white px-3 py-1">
                    {option?.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-gray-500">© 2025 SentiCare AI Systems</p>
        </div>
      </div>
    </div>
  );
}
