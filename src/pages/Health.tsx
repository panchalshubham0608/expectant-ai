import { CalendarDays, FileText, FlaskConical, Pill, Stethoscope } from 'lucide-react';

function Health() {
  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold">Pregnancy Health 🌱</h1>

        <p className="mt-1 text-gray-500">Week 8 • Day 5</p>
      </div>

      {/* Pregnancy Summary */}

      <section
        className="
        rounded-2xl
        bg-white
        p-5
        shadow-sm
      "
      >
        <h2 className="font-medium">Pregnancy Overview</h2>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            📅 Expected Due Date:
            <span className="ml-2 font-medium">March 2027</span>
          </p>

          <p>
            🩺 Doctor Visit:
            <span className="ml-2 font-medium">25 July 2026</span>
          </p>
        </div>
      </section>

      {/* Latest Reports */}

      <section
        className="
        rounded-2xl
        bg-white
        p-5
        shadow-sm
      "
      >
        <div className="flex items-center gap-2">
          <FileText size={20} />

          <h2 className="font-medium">Latest Reports</h2>
        </div>

        <div className="mt-4 space-y-3">
          <ReportCard
            icon={<CalendarDays size={18} />}
            title="Ultrasound"
            subtitle="18 July 2026"
            status="Completed"
          />

          <ReportCard
            icon={<FlaskConical size={18} />}
            title="Blood Test"
            subtitle="Hemoglobin, TSH, Vitamin D"
            status="Completed"
          />
        </div>
      </section>

      {/* Supplements */}

      <section
        className="
        rounded-2xl
        bg-white
        p-5
        shadow-sm
      "
      >
        <div className="flex items-center gap-2">
          <Pill size={20} />

          <h2 className="font-medium">Supplements</h2>
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          <li>✅ Folic Acid</li>

          <li>✅ Vitamin D</li>

          <li>⏳ Calcium (from week 12)</li>
        </ul>
      </section>

      {/* Doctor Notes */}

      <section
        className="
        rounded-2xl
        bg-white
        p-5
        shadow-sm
      "
      >
        <div className="flex items-center gap-2">
          <Stethoscope size={20} />

          <h2 className="font-medium">Doctor Notes</h2>
        </div>

        <p
          className="
          mt-3
          text-sm
          text-gray-600
        "
        >
          Next visit: Discuss nausea management and upcoming scans.
        </p>
      </section>
    </div>
  );
}

function ReportCard({
  icon,
  title,
  subtitle,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <div
      className="
      flex
      items-center
      justify-between
      rounded-xl
      bg-gray-50
      p-3
    "
    >
      <div className="flex gap-3">
        {icon}

        <div>
          <p className="text-sm font-medium">{title}</p>

          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      <span
        className="
        text-xs
        text-green-700
      "
      >
        {status}
      </span>
    </div>
  );
}

export default Health;
