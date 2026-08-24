import type { Reminder } from '../../models/reminder';
import type { Appointment } from '../../models/appointment';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

let cachedAccessToken: string | null = null;
let cachedCalendarId: string | null = null;

export const getCalendarAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;

  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  // The full calendar scope allows creating new calendars and managing events
  provider.addScope('https://www.googleapis.com/auth/calendar');

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

export const getOrCreateExpectantAiCalendar = async (accessToken: string): Promise<string> => {
  if (cachedCalendarId) return cachedCalendarId;

  // 1. Check if the calendar already exists
  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const listData = await listRes.json();
  const existing = listData.items?.find((c: any) => c.summary === 'Expectant AI');
  
  if (existing) {
    cachedCalendarId = existing.id;
    return existing.id;
  }

  // 2. Create the calendar if it doesn't exist
  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ summary: 'Expectant AI' })
  });
  const createData = await createRes.json();
  
  if (!createData.id) {
    throw new Error('Failed to create Expectant AI calendar');
  }

  cachedCalendarId = createData.id;
  return createData.id;
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

  const calendarId = await getOrCreateExpectantAiCalendar(accessToken);
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

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
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
  const calendarId = await getOrCreateExpectantAiCalendar(accessToken);

  let response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // Fallback: Check if the event was created in the primary calendar before this update
  if (!response.ok && response.status === 404) {
    response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }

  if (!response.ok) {
    console.error(`Failed to delete calendar event ${eventId}: ${response.statusText}`);
  }
}

export async function clearAllCalendarEvents(accessToken: string): Promise<{ successCount: number; failureCount: number }> {
  const calendarId = await getOrCreateExpectantAiCalendar(accessToken);
  let pageToken: string | undefined = undefined;
  let successCount = 0;
  let failureCount = 0;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    if (pageToken) url.searchParams.append('pageToken', pageToken);
    
    const searchRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const data = await searchRes.json();
    if (!data.items || data.items.length === 0) break;

    for (const event of data.items) {
      const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event.id}`, {
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

export async function deleteAllCalendarEventsForReminder(reminder: Reminder, accessToken: string): Promise<Reminder> {
  if (reminder.googleCalendarEventIds && reminder.googleCalendarEventIds.length > 0) {
    for (const eventId of reminder.googleCalendarEventIds) {
      await deleteCalendarEvent(eventId, accessToken);
    }
  }
  return { ...reminder, googleCalendarEventIds: [] };
}

export async function resyncReminderToCalendar(reminder: Reminder, accessToken: string, syncEnabled: boolean): Promise<Reminder> {
  let updatedReminder = await deleteAllCalendarEventsForReminder(reminder, accessToken);

  if (syncEnabled && updatedReminder.isActive !== false) {
    updatedReminder = await syncReminderToCalendar(updatedReminder, accessToken);
  }

  return updatedReminder;
}

export async function syncAppointmentToCalendar(appointment: Appointment, accessToken: string): Promise<Appointment> {
  const calendarId = await getOrCreateExpectantAiCalendar(accessToken);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const startTime = new Date(appointment.scheduledAt);
  const endTime = new Date(startTime.getTime() + 60 * 60000); // Default 1 hour duration

  const event = {
    summary: appointment.reason || 'Medical Appointment',
    description: [
      appointment.doctorName ? `Doctor: ${appointment.doctorName}` : '',
      appointment.specialty ? `Specialty: ${appointment.specialty}` : '',
      appointment.hospital ? `Hospital: ${appointment.hospital}` : '',
    ].filter(Boolean).join('\n'),
    start: { dateTime: startTime.toISOString(), timeZone },
    end: { dateTime: endTime.toISOString(), timeZone },
  };

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event)
  });

  if (response.ok) {
    const data = await response.json();
    if (data.id) return { ...appointment, googleCalendarEventId: data.id };
  }

  return appointment;
}

export async function deleteCalendarEventForAppointment(appointment: Appointment, accessToken: string): Promise<Appointment> {
  if (appointment.googleCalendarEventId) {
    await deleteCalendarEvent(appointment.googleCalendarEventId, accessToken);
  }
  return { ...appointment, googleCalendarEventId: "" };
}

export async function resyncAppointmentToCalendar(appointment: Appointment, accessToken: string, syncEnabled: boolean): Promise<Appointment> {
  let updatedAppointment = await deleteCalendarEventForAppointment(appointment, accessToken);

  if (syncEnabled && updatedAppointment.status !== 'cancelled') {
    updatedAppointment = await syncAppointmentToCalendar(updatedAppointment, accessToken);
  }

  return updatedAppointment;
}
