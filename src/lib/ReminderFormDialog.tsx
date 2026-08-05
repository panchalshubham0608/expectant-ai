import { useId, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Reminder, ReminderFrequency } from '../models/reminder';

interface ReminderFormDialogProps {
  initialValues?: Reminder;
  onClose: () => void;
  onSubmit: (reminder: Partial<Reminder>) => void;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100';

export default function ReminderFormDialog({
  initialValues,
  onClose,
  onSubmit,
}: ReminderFormDialogProps) {
  const titleId = useId();

  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [frequency, setFrequency] = useState<ReminderFrequency>(initialValues?.frequency || 'daily');
  
  const [timeMode, setTimeMode] = useState<'times' | 'interval'>(
    initialValues?.interval ? 'interval' : 'times'
  );
  
  const [times, setTimes] = useState<string[]>(initialValues?.times || ['08:00']);
  const [interval, setIntervalVal] = useState<number>(initialValues?.interval || 1);
  const [intervalUnit, setIntervalUnit] = useState<'hours' | 'minutes'>(initialValues?.intervalUnit || 'hours');
  const [startTime, setStartTime] = useState(initialValues?.startTime || '08:00');
  const [endTime, setEndTime] = useState(initialValues?.endTime || '20:00');

  const handleTimeChange = (index: number, val: string) => {
    const newTimes = [...times];
    newTimes[index] = val;
    setTimes(newTimes);
  };

  const addTime = () => setTimes([...times, '12:00']);
  const removeTime = (index: number) => setTimes(times.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const reminder: Partial<Reminder> = {
      title,
      description,
      frequency,
      isActive: initialValues?.isActive ?? true,
    };

    if (timeMode === 'times') {
      reminder.times = times;
      reminder.interval = undefined;
      reminder.intervalUnit = undefined;
      reminder.startTime = undefined;
      reminder.endTime = undefined;
    } else {
      reminder.times = undefined;
      reminder.interval = interval;
      reminder.intervalUnit = intervalUnit;
      reminder.startTime = startTime;
      reminder.endTime = endTime;
    }

    if (initialValues?.id) {
      reminder.id = initialValues.id;
    }

    onSubmit(reminder);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[84dvh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">
              {initialValues ? 'Edit Reminder' : 'Add Reminder'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hydration"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description (Optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Drink a glass of water"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
              className={inputClass}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="once">Once</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="mb-3 flex items-center gap-4 rounded-xl bg-gray-100/50 p-1">
              <button
                type="button"
                onClick={() => setTimeMode('times')}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  timeMode === 'times' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Specific Times
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('interval')}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  timeMode === 'interval' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Time Interval
              </button>
            </div>

            {timeMode === 'times' ? (
              <div className="space-y-3">
                {times.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input type="time" required value={time} onChange={(e) => handleTimeChange(index, e.target.value)} className={inputClass} />
                    {times.length > 1 && (
                      <button type="button" onClick={() => removeTime(index)} className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addTime} className="flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800">
                  <Plus size={16} /> Add Time
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Every</span>
                  <input type="number" min="1" required value={interval} onChange={(e) => setIntervalVal(Number(e.target.value))} className={`${inputClass} w-20 text-center`} />
                  <select value={intervalUnit} onChange={(e) => setIntervalUnit(e.target.value as 'hours' | 'minutes')} className={inputClass}>
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">From</label><input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-500">Until</label><input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} /></div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">Cancel</button>
            <button type="submit" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              {initialValues ? 'Save Changes' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}