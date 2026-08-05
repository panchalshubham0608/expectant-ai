export type ReminderFrequency = 'daily' | 'weekly' | 'custom' | 'once';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  
  frequency: ReminderFrequency;
  
  // For specific times, e.g., ["10:00", "21:00"]
  times?: string[];
  
  // For intervals, e.g., every 1 hour
  interval?: number;
  intervalUnit?: 'hours' | 'minutes';
  
  // Time boundaries for intervals, e.g., 07:00 to 21:00
  startTime?: string;
  endTime?: string;

  startDate?: string;
  endDate?: string;

  isActive: boolean;
}