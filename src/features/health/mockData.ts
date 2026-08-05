import type {
  MedicalRecord,
} from '../../models/medical';

export const medicalRecordsData: MedicalRecord[] = [];

export const doctorVisitsData = [
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

export const aiInsightsData = [
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

export const pregnancyTimelineData = [
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