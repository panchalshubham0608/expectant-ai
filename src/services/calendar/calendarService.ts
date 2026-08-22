import type { Reminder } from '../../models/reminder';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

let cachedAccessToken: string | null = null;

export const getCalendarAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;

  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  // The calendar.events scope limits access only to reading and writing events
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  // 1. Authenticate & get the Google Calendar access token
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('Failed to obtain Google Calendar access token.');
  }

  cachedAccessToken = token;
  return token;
};

export function getBaseTimesForDailyReminder(reminder: Reminder): Date[] {
  const timestamps: Date[] = [];
  const currentDay = new Date();
  currentDay.setHours(0, 0, 0, 0);

  if (reminder.times && reminder.times.length > 0) {
    for (const time of reminder.times) {
      const [hours, minutes] = time.split(':').map(Number);
      const eventTime = new Date(currentDay);
      eventTime.setHours(hours, minutes, 0, 0);
      timestamps.push(eventTime);
    }
  } else if (reminder.interval && reminder.intervalUnit && reminder.startTime && reminder.endTime) {
    const [startH, startM] = reminder.startTime.split(':').map(Number);
    const [endH, endM] = reminder.endTime.split(':').map(Number);
    
    const eventTime = new Date(currentDay);
    eventTime.setHours(startH, startM, 0, 0);
    
    const dayEndTime = new Date(currentDay);
    dayEndTime.setHours(endH, endM, 0, 0);
    
    while (eventTime <= dayEndTime) {
      timestamps.push(new Date(eventTime));
      if (reminder.intervalUnit === 'hours') {
        eventTime.setHours(eventTime.getHours() + reminder.interval);
      } else {
        eventTime.setMinutes(eventTime.getMinutes() + reminder.interval);
      }
    }
  }

  return timestamps;
}

export async function syncReminderToCalendar(reminder: Reminder, accessToken: string): Promise<Reminder> {
  if (reminder.frequency !== 'daily') {
    return reminder;
  }

  const timestamps = getBaseTimesForDailyReminder(reminder);
  const eventIds: string[] = [];

  for (const timestamp of timestamps) {
    const endDate = new Date(timestamp.getTime() + 15 * 60000); // Default 15 minute duration
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const event = {
      summary: reminder.title,
      description: reminder.description || '',
      start: { dateTime: timestamp.toISOString(), timeZone },
      end: { dateTime: endDate.toISOString(), timeZone },
      recurrence: ['RRULE:FREQ=DAILY'],
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.id) eventIds.push(data.id);
    }
  }

  return { ...reminder, googleCalendarEventIds: [...(reminder.googleCalendarEventIds || []), ...eventIds] };
}

export async function deleteCalendarEvent(eventId: string, accessToken: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error(`Failed to delete calendar event ${eventId}: ${response.statusText}`);
  }
}

export async function clearAllCalendarEvents(accessToken: string): Promise<{ successCount: number; failureCount: number }> {
  let pageToken: string | undefined = undefined;
  let successCount = 0;
  let failureCount = 0;

  do {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    if (pageToken) url.searchParams.append('pageToken', pageToken);
    
    const searchRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const data = await searchRes.json();
    if (!data.items || data.items.length === 0) break;

    for (const event of data.items) {
      const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (delRes.ok) successCount++;
      else failureCount++;
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { successCount, failureCount };
}
