import type {
  AIInsight,
  DoctorVisit,
  HealthScore,
  MedicalRecord,
  Measurement,
  MotherProfile,
  TimelineEvent,
} from './types';

export const healthScoreData: HealthScore = {
  score: 88,
  trend: 'Stable',
  highlight: 'Excellent hydration and nutrition this week.',
  details: [
    'Fetal heartbeat strong',
    'Blood pressure within healthy range',
    'Balanced meal planning on track',
  ],
};

export const motherProfileData: MotherProfile = {
  name: 'Arianna Smith',
  dateOfBirth: '1994-03-15',
  lmp: '2026-05-10',
  dueDate: '2027-03-28',
  location: 'San Francisco, CA',
  avatar: 'AS',
  bloodGroup: 'O+',
  careProvider: 'Dr. Elena Rivera',
  emergencyContact: 'Jordan Smith • (415) 555-0148',
};

export const measurementsData: Measurement[] = [
  {
    id: 'm-1',
    label: 'Weight',
    value: '62.6 kg',
    previousValue: '61.0 kg',
    change: '+1.6 kg',
    lastMeasuredDate: '2026-07-18',
  },
  {
    id: 'm-2',
    label: 'Blood Pressure',
    value: '118/76',
    previousValue: '120/78',
    change: 'Stable',
    lastMeasuredDate: '2026-07-18',
  },
  {
    id: 'm-3',
    label: 'Heart Rate',
    value: '78 bpm',
    previousValue: '76 bpm',
    change: '+2 bpm',
    lastMeasuredDate: '2026-07-18',
  },
  {
    id: 'm-4',
    label: 'Baby Growth',
    value: '295 g',
    previousValue: '275 g',
    change: '+20 g',
    lastMeasuredDate: '2026-07-18',
  },
];

export const medicalRecordsData: MedicalRecord[] = [
  {
    id: 'rec-1',
    title: 'Ultrasound Scan',
    date: '18 Jul 2026',
    status: 'Completed',
    summary: 'Healthy growth and amniotic fluid normal.',
  },
  {
    id: 'rec-2',
    title: 'Blood Panel',
    date: '12 Jul 2026',
    status: 'Completed',
    summary: 'Iron levels good, vitamin D slightly low.',
  },
  {
    id: 'rec-3',
    title: 'Glucose Test',
    date: '03 Jul 2026',
    status: 'Pending',
    summary: 'Awaiting lab confirmation.',
  },
];

export const doctorVisitsData: DoctorVisit[] = [
  {
    id: 'visit-1',
    provider: 'Dr. Mehta',
    specialty: 'Obstetrics',
    date: '25 Jul 2026',
    note: 'Discuss nutrition and scan results.',
  },
  {
    id: 'visit-2',
    provider: 'Dr. Lee',
    specialty: 'Nutritionist',
    date: '01 Aug 2026',
    note: 'Review supplement plan and meal prep.',
  },
];

export const aiInsightsData: AIInsight[] = [
  {
    id: 'insight-1',
    title: 'Sleep rhythm looks strong',
    description: 'Your rest pattern is consistent, supporting recovery and growth.',
  },
  {
    id: 'insight-2',
    title: 'Hydration milestone reached',
    description: 'You met your hydration goal for 5 days in a row this week.',
  },
  {
    id: 'insight-3',
    title: 'Gentle activity recommended',
    description: 'Try a 15-minute walk after meals to ease digestion.',
  },
];

export const pregnancyTimelineData: TimelineEvent[] = [
  {
    id: 'event-1',
    week: 'Week 20',
    date: '17 Jul 2026',
    title: 'Anatomy scan complete',
    status: 'Done',
  },
  {
    id: 'event-2',
    week: 'Week 22',
    date: '25 Jul 2026',
    title: 'Doctor visit scheduled',
    status: 'Upcoming',
  },
  {
    id: 'event-3',
    week: 'Week 24',
    date: '05 Aug 2026',
    title: 'Nutrition review',
    status: 'Planned',
  },
];
