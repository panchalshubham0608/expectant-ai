import MedicationRemindersCard from '../features/health/components/MedicationRemindersCard';
import RemindersCard from '../features/health/components/RemindersCard';
import MomentPreferenceCard from '../features/health/components/MomentPreferenceCard';

export default function Reminders() {
  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-blue-500 to-blue-700 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Reminders</h1>
          <p className="text-sm text-blue-50/90 max-w-[280px] leading-relaxed">
            Stay on top of your daily medications and schedule.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 px-4">
        <div className="flex flex-col gap-5">
          <MomentPreferenceCard />
          <MedicationRemindersCard />
          <RemindersCard />
        </div>
      </div>
    </div>
  );
}