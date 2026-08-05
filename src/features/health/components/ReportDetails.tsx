import type { Report } from '../../../models/report';
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle2,
    ClipboardList,
    HelpCircle,
    Hospital,
    Info,
    ListChecks,
    Pill,
    Stethoscope,
    Trash2,
    X,
} from 'lucide-react';

interface ReportDetailsProps {
    report: Report;
    onClose: () => void;
    onDeleteClick?: () => void;
}

function ReportDetails({ report, onClose, onDeleteClick }: ReportDetailsProps) {
    return (
        <div className="medical-records-card__modal">
            <div className="medical-records-card__modal-card">
                <div className="medical-records-card__modal-header">
                    <div>
                        <p className="medical-records-card__label">Report Details</p>
                        <h3 className="medical-records-card__title">{report.title}</h3>
                        <p className="medical-records-card__modal-meta">{report.reportDate} · {report.reportType}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {onDeleteClick && (
                            <button type="button" className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors shrink-0" onClick={onDeleteClick} title="Delete report">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button type="button" className="medical-records-card__close !p-2" onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="medical-records-card__detail-grid">
                    <section className="medical-records-card__detail-panel medical-records-card__detail-panel--highlight">
                        <div className="mb-2 flex items-center gap-2">
                            <ClipboardList size={18} className="text-emerald-700" />
                            <p className="medical-records-card__detail-label !mt-0">Summary</p>
                        </div>
                        <p className="medical-records-card__detail-value medical-records-card__detail-value--lead">{report.summary.plainEnglish}</p>

                        <div className="medical-records-card__detail-actions">
                            <a
                                href={report.reportUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="medical-records-card__detail-button"
                            >
                                View report
                            </a>
                        </div>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-4 flex items-center gap-2">
                            <Info size={16} className="text-blue-600" />
                            <p className="medical-records-card__detail-label !mt-0">Key Information</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Stethoscope size={14} /> Doctor</span>
                                {report.metadata.doctor ? <span className="text-sm font-medium text-slate-800">{report.metadata.doctor}</span> : <span className="text-sm italic text-slate-400">Not specified</span>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Hospital size={14} /> Hospital</span>
                                {report.metadata.hospital ? <span className="text-sm font-medium text-slate-800">{report.metadata.hospital}</span> : <span className="text-sm italic text-slate-400">Not specified</span>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Calendar size={14} /> Date</span>
                                {report.reportDate ? <span className="text-sm font-medium text-slate-800">{report.reportDate}</span> : <span className="text-sm italic text-slate-400">Not specified</span>}
                            </div>
                            {report.metadata.pregnancyWeek && <div className="flex flex-col gap-1.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Activity size={14} /> Pregnancy Wk</span>
                                <span className="text-sm font-medium text-slate-800">{report.metadata.pregnancyWeek}</span>
                            </div>}
                        </div>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-600" />
                            <p className="medical-records-card__detail-label !mt-0">Important findings</p>
                        </div>
                        <ul className="space-y-3">
                            {report.summary.importantFindings.length > 0 ? (
                                report.summary.importantFindings.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                        <span>{item}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm italic text-slate-400">No important findings listed.</li>
                            )}
                        </ul>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <ListChecks size={16} className="text-emerald-600" />
                            <p className="medical-records-card__detail-label !mt-0">Follow-up actions</p>
                        </div>
                        <ul className="space-y-3">
                            {report.summary.followUpActions.length > 0 ? (
                                report.summary.followUpActions.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                        <span>{item}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm italic text-slate-400">No follow-up actions listed.</li>
                            )}
                        </ul>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <HelpCircle size={16} className="text-purple-600" />
                            <p className="medical-records-card__detail-label !mt-0">Questions for doctor</p>
                        </div>
                        <ul className="space-y-3">
                            {report.summary.questionsForDoctor.length > 0 ? (
                                report.summary.questionsForDoctor.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                                        <span>{item}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm italic text-slate-400">No questions listed.</li>
                            )}
                        </ul>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <Pill size={16} className="text-rose-500" />
                            <p className="medical-records-card__detail-label !mt-0">Medicines</p>
                        </div>
                        <ul className="space-y-3">
                            {report.medicines.length > 0 ? (
                                report.medicines.map((medicine, index) => (
                                    <li key={index} className="flex flex-col rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                                        <span className="font-medium text-slate-900">{medicine.name}</span>
                                        <span className="mt-1 text-xs text-slate-500">
                                            {[medicine.dose, medicine.frequency, medicine.duration].filter(Boolean).join(' · ')}
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm italic text-slate-400">No medicines listed.</li>
                            )}
                        </ul>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <Activity size={16} className="text-indigo-500" />
                            <p className="medical-records-card__detail-label !mt-0">Diagnoses mentioned</p>
                        </div>
                        <ul className="space-y-3">
                            {report.diagnoses.length > 0 ? (
                                report.diagnoses.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                        <span>{item}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm italic text-slate-400">No diagnoses mentioned.</li>
                            )}
                        </ul>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-teal-600" />
                            <p className="medical-records-card__detail-label !mt-0">Recommendations</p>
                        </div>
                        <ul className="space-y-3">
                            {report.recommendations.length > 0 ? (
                                report.recommendations.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                                        <span>{item}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm italic text-slate-400">No recommendations listed.</li>
                            )}
                        </ul>
                    </section>

                    <section className="medical-records-card__detail-panel">
                        <div className="mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-orange-500" />
                            <p className="medical-records-card__detail-label !mt-0">Next visit</p>
                        </div>
                        {report.nextVisit ? (
                            <p className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-sm font-medium text-orange-900">
                                <Calendar size={16} className="text-orange-600" />
                                {report.nextVisit}
                            </p>
                        ) : (
                            <p className="text-sm italic text-slate-400">No next visit scheduled.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>

    )
};

export default ReportDetails;
