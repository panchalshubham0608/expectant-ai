# Expectant AI

**Expectant AI** is an AI-powered pregnancy companion built with React, TypeScript, Firebase, and Google Gemini. It helps expectant parents track pregnancy milestones, receive personalized daily digests and weekly updates, manage medical reports and appointments, log daily health and nutrition, and chat with a context-aware AI companion.

---

## ✨ Key Features

- **Pregnancy Profile & Gestational Age Tracking**
  - Create and share expectant profiles with partners or family members (`sharedWith`).
  - Automatic trimester, current week, and gestational age calculation from LMP / ultrasound-adjusted LMP.
- **Daily Digest**
  - **Daily Little Wonders**: Bite-sized daily pregnancy facts, bonding moments, and partner tips tailored to the current week and day.
  - **Spiritual Sloka & Mantra**: Daily Sanskrit/Indic verses with native-language translations, reflections, and natural multi-section read-aloud audio.
  - **Talking to the Womb**: Guided daily prompts and scripts to talk, read, or sing to your baby based on fetal sensory development.
  - **Baby Name Ideas**: Personalized daily baby name suggestions with meanings, origins, and favorites list.
- **Weekly Pregnancy Updates**
  - Week-by-week fetal size comparisons, developmental highlights, body changes, couple moments, and curated weekly visuals.
- **AI Companion & Journal Chat**
  - Context-aware conversational assistant powered by Google Gemini (`@google/genai`), grounded in your profile, health logs, medical reports, and appointments.
  - Supports image/PDF attachments and rich markdown responses.
- **Medical Reports & Appointments**
  - Upload and analyze lab reports, ultrasound scans, and prescriptions with AI-extracted summaries, measurements, medicines, and historical comparisons.
  - Store report attachments in Google Drive and sync upcoming doctor visits with Google Calendar.
- **Health, Vitals & Pantry Tracking**
  - Track daily hydration, sleep, physical activity, weight, blood pressure, and blood glucose.
  - Manage medications, custom reminders with push notifications, and pantry/nutrition items.
- **Cross-Platform (PWA & Android)**
  - Installable Progressive Web App (`vite-plugin-pwa`) and Android WebView wrapper (`build:android`).

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Lucide Icons
- **Backend & Auth**: Firebase Authentication (Google Sign-In), Cloud Firestore, Firebase Cloud Messaging
- **AI**: Google Gemini API (`@google/genai`)
- **Integrations**: Google Drive API (medical report attachments), Google Calendar API (appointments), PDF.js (`pdfjs-dist`)

---

## 🚀 Getting Started

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Firebase and Gemini API credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

*(Users can also configure their own Gemini API key directly from the in-app **More → Gemini API Key** menu.)*

### 3. Firebase & Firestore Setup

1. In the [Firebase Console](https://console.firebase.google.com/), create a web app and enable **Authentication → Sign-in method → Google**.
2. Add your local (`localhost`) and deployed domains to Firebase Authentication's **Authorized domains** list.
3. Create a **Cloud Firestore** database. Profiles are stored under `users/{userId}/profiles/{profileId}`.
4. Configure Firestore Security Rules so authenticated users can read and write their own profiles as well as profiles shared with their email address:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/profiles/{profileId} {
      allow create: if request.auth != null && request.auth.uid == userId;
    }
    match /{path=**}/profiles/{profileId} {
      allow read, write: if request.auth != null && (
        request.auth.uid == resource.data.creatorId ||
        (resource.data.sharedWith != null && request.auth.token.email in resource.data.sharedWith)
      );
    }
  }
}
```

### 4. Run the development server

```bash
# Standard HTTP dev server
npm run dev

# HTTPS dev server
npm run dev:https
```

---

## 📦 Build & Deployment

```bash
# Type-check and build for production (Web / PWA)
npm run build

# Preview production build locally
npm run preview

# Build and copy web assets into the Android project
npm run build:android

# Deploy to GitHub Pages
npm run deploy
```

---

## 📁 Project Structure

```text
src/
├── auth/           # Authentication context and route guards
├── components/     # Reusable UI components (home cards, journal chat, profile dialogs, layout)
├── features/       # Feature modules (health, reminders, vitals, nutrition)
├── hooks/          # Custom React hooks (useAuth, useProfile, etc.)
├── lib/            # Firebase & messaging initialization
├── models/         # TypeScript domain models
├── pages/          # Route-level page components
├── prompts/        # System and generation prompts for Gemini AI services
├── services/       # Firestore & AI services (dailyDigests, weeklyUpdates, reports, appointments, ai)
└── utils/          # Pregnancy gestational age and helper utilities
```
