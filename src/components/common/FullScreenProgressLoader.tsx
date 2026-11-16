import { useEffect, useRef, useState } from 'react';
import { Calendar, HardDrive, Loader2 } from 'lucide-react';
import {
  isCalendarTokenRequesting,
  subscribeToCalendarTokenUpdates,
} from '../../services/calendar/calendarService';
import {
  isDriveTokenPopupRequesting,
  subscribeToDriveCacheUpdates,
} from '../../services/storage/googleDriveService';

interface FullScreenProgressLoaderProps {
  isOpen: boolean;
  progress: number;
  title: string;
  subtitle?: string;
}

const MIN_LOADER_VISIBLE_MS = 900;

export function GoogleTokenRequestLoader() {
  const [activeService, setActiveService] = useState<'drive' | 'calendar' | null>(null);
  const shownAtRef = useRef<number>(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncState = () => {
      const calendarActive = isCalendarTokenRequesting();
      const driveActive = isDriveTokenPopupRequesting();
      const nextService: 'drive' | 'calendar' | null = calendarActive
        ? 'calendar'
        : driveActive
          ? 'drive'
          : null;

      if (nextService) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        if (shownAtRef.current === 0) {
          shownAtRef.current = Date.now();
        }
        setActiveService(nextService);
      } else if (shownAtRef.current > 0) {
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = setTimeout(() => {
          shownAtRef.current = 0;
          hideTimerRef.current = null;
          setActiveService(null);
        }, remaining);
      }
    };

    syncState();
    const unsubDrive = subscribeToDriveCacheUpdates(syncState);
    const unsubCalendar = subscribeToCalendarTokenUpdates(syncState);

    return () => {
      unsubDrive();
      unsubCalendar();
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!activeService) return null;

  const isCalendar = activeService === 'calendar';
  const title = isCalendar
    ? 'Connecting to Google Calendar...'
    : 'Connecting to Google Drive...';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px] transition-opacity"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-xs flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-50/80 text-blue-600 ring-1 ring-blue-100">
          <Loader2 className="absolute inset-0 h-full w-full animate-spin text-blue-500/30 p-1" strokeWidth={2.5} />
          {isCalendar ? <Calendar size={28} /> : <HardDrive size={28} />}
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-slate-800">
          {title}
        </p>
        <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
          Verifying your Google permissions. A browser window may briefly open and close automatically.
        </p>
      </div>
    </div>
  );
}

export default function FullScreenProgressLoader({
  isOpen,
  progress,
  title,
  subtitle = "Please do not close the app.",
}: FullScreenProgressLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px] transition-opacity">
      <div className="flex w-full max-w-xs flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              className="text-slate-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className="text-blue-600 transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (progress / 100) * 251.2}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
          </svg>
          <span className="text-xl font-bold text-slate-700">{progress}%</span>
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-slate-800">
          {title}
        </p>
        {subtitle && (
          <p className="mt-2 text-center text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}