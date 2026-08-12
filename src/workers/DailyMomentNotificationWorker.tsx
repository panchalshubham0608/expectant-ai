import { useEffect, useRef } from 'react';
import { subscribeToReminders } from '../services/reminders/reminderService';
import { getDailyMoment } from '../services/dailyMoments/dailyMomentsService';
import type { Reminder } from '../models/reminder';

interface DailyMomentNotificationWorkerProps {
  userId: string;
  profileId: string;
}

export default function DailyMomentNotificationWorker({ userId, profileId }: DailyMomentNotificationWorkerProps) {
  const reminderRef = useRef<Reminder | null>(null);
  const notifiedDateRef = useRef<string | null>(null);

  // 1. Maintain a real-time reference to the user's notification preferences
  useEffect(() => {
    const unsubscribe = subscribeToReminders(
      userId,
      profileId,
      (reminders) => {
        reminderRef.current = reminders.find((r) => r.id === 'daily-moment') || null;
      },
      (err) => console.error('Error fetching reminder for worker:', err)
    );
    return () => unsubscribe();
  }, [userId, profileId]);

  // 2. The background polling loop
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const checkAndFireNotification = async () => {
      const reminder = reminderRef.current;
      if (!reminder?.isActive || !reminder.times?.[0]) return;

      const targetTime = reminder.times[0]; // e.g., "09:00"
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayId = `${year}-${month}-${day}`;

      // Check if time matches and we haven't already fired it today
      if (currentTime === targetTime && notifiedDateRef.current !== todayId) {
        notifiedDateRef.current = todayId; // Optimistically mark as notified

        try {
          const moment = await getDailyMoment(userId, profileId, todayId);
          const title = `✨ ${moment?.header || '✨ Today\'s little wonder'}`;
          const options = {
            body: `${moment?.notification || `See what today's little surprise has in store.`}`,
            tag: `daily-moment-${todayId}`,
            requireInteraction: true,
          };
          if (moment) {
            // Try using the Service Worker if available for better mobile support, otherwise fallback to native
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg) {
                await reg.showNotification(title, options);
                return;
              }
            }
            alert(`Notification: ${title}\n\n${options.body}`); // Fallback for browsers without SW support
            new Notification(title, options);
          }
        } catch (error) {
          console.error('Failed to trigger daily moment notification:', error);
        }
      }
    };

    // Check every 60 seconds
    const interval = setInterval(checkAndFireNotification, 60000);

    return () => clearInterval(interval);
  }, [userId, profileId]);

  return null; // This component is strictly logical and renders nothing
}