import { useState, useEffect, useRef } from 'react';
import { BellRing, CheckCircle2, Circle, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';

export default function MedicationRemindersCard() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [takenItems, setTakenItems] = useState<Set<string>>(new Set());
  const notifiedItems = useRef<Set<string>>(new Set());

  // Mock data for today's reminders
  const mockReminders = [
    { id: 'r1', time: '09:55 PM', name: 'Prenatal Vitamins', dose: '1 tablet' },
    { id: 'r2', time: '02:00 PM', name: 'Iron Supplement', dose: '65 mg' },
    { id: 'r3', time: '08:00 PM', name: 'Progesterone', dose: '200 mg' },
  ];

  // Modern browsers prefer notifications to be routed through a Service Worker
  const fireNotification = async (title: string, options: NotificationOptions) => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    }
    
    // Fallback for desktop browsers without a service worker
    new Notification(title, options);
  };

  // Check for notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  // The Local Frontend Background Scheduler
  useEffect(() => {
    if (!pushEnabled || !('Notification' in window)) return;

    // Check every minute to see if any reminder matches the current time
    const interval = setInterval(() => {
      const now = new Date();
      // Formats current time to match the mock format exactly, e.g. "08:00 AM"
      const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      mockReminders.forEach((reminder) => {
        // If the time matches, the user hasn't checked it off, and we haven't already notified them
        if (reminder.time === timeString && !takenItems.has(reminder.id) && !notifiedItems.current.has(reminder.id)) {
          notifiedItems.current.add(reminder.id);
          console.log(`Triggering notification for: ${reminder.name}`);
          fireNotification('Medication Reminder 💊', {
            body: `It's time to take your ${reminder.name} (${reminder.dose}).`,
            tag: reminder.id, // Prevents duplicate spamming
            requireInteraction: true,
          });
        }
      });
    }, 1000); // 60,000 ms = 1 minute

    // We also run the check immediately on mount/update so we don't have to wait 60s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushEnabled, takenItems]);


  const toggleTaken = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(takenItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setTakenItems(newSet);
  };

  const handleTogglePush = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications.');
      return;
    }

    if (!pushEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        fireNotification('Reminders Enabled', { body: 'You will now receive local reminders when the app is open.' });
      }
    } else {
      setPushEnabled(false);
    }
  };

  const sendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('Sending test notification...');
      fireNotification('Test Reminder 💊', {
        body: 'This is a test notification! Your browser permissions are working.',
        requireInteraction: true,
      });
    }
  };

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div
        className="flex cursor-pointer select-none items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <BellRing className="text-blue-500" size={20} />
          Today's Reminders
        </h3>
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5">
          {/* Push Notifications Toggle */}
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100/50">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                <Smartphone size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Push Notifications</h4>
                <p className="text-xs text-slate-500">Get alerts directly on your phone</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTogglePush}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                pushEnabled ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={pushEnabled}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  pushEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {pushEnabled && (
            <button
              type="button"
              onClick={sendTestNotification}
              className="mb-5 w-full rounded-xl bg-blue-50 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
            >
              Send Test Notification
            </button>
          )}

          {/* Reminders List */}
          <div className="space-y-3">
            {mockReminders.map((reminder) => {
              const isTaken = takenItems.has(reminder.id);
              return (
                <div
                  key={reminder.id}
                  className={`relative flex items-center justify-between gap-3 rounded-2xl p-4 transition-all duration-200 ${
                    isTaken
                      ? 'bg-slate-50 opacity-75 ring-1 ring-slate-100'
                      : 'bg-white shadow-sm ring-1 ring-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={(e) => toggleTaken(reminder.id, e)}
                      className={`flex shrink-0 transition-colors ${
                        isTaken ? 'text-green-500' : 'text-slate-300 hover:text-blue-500'
                      }`}
                    >
                      {isTaken ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div>
                      <h4
                        className={`font-semibold transition-all ${
                          isTaken ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'
                        }`}
                      >
                        {reminder.name}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {reminder.time}
                        </span>
                        <span className="text-xs text-slate-500">{reminder.dose}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}