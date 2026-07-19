import '../styles/pages/Health.css';
import {
  AIInsightsCard,
  DoctorVisitsCard,
  HealthScoreCard,
  MedicalRecordsCard,
  MeasurementsCard,
  MotherProfileCard,
  TimelineCard,
  aiInsightsData,
  doctorVisitsData,
  healthScoreData,
  medicalRecordsData,
  measurementsData,
  motherProfileData,
  pregnancyTimelineData,
} from '../features/health';

function Health() {
  return (
    <div className="health-page">
      <header className="health-header">
        <div className="health-header__row">
          <div>
            <h1 className="health-header__title">Pregnancy Health</h1>
            <p className="health-header__subtitle">Week 20 • Day 3</p>
          </div>
          <div className="health-header__badge">Next visit: 25 Jul</div>
        </div>
      </header>

      <div className="health-grid">
        <AIInsightsCard insights={aiInsightsData} />
        <HealthScoreCard data={healthScoreData} />
        <MotherProfileCard profile={motherProfileData} />
        <MeasurementsCard measurements={measurementsData} />
        <DoctorVisitsCard visits={doctorVisitsData} />
        <MedicalRecordsCard records={medicalRecordsData} />
        <TimelineCard events={pregnancyTimelineData} />
      </div>
    </div>
  );
}

export default Health;
