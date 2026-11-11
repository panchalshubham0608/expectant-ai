function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function isTimeInWindow(timeMins: number, startMins: number, endMins: number): boolean {
    if (startMins <= endMins) {
        return timeMins >= startMins && timeMins <= endMins;
    } else {
        // Handle midnight crossover (e.g., window from 23:30 to 00:30)
        return timeMins >= startMins || timeMins <= endMins;
    }
}

const JS_DAY_TO_CODE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

function getCurrentDatePartsInIST(now = new Date()): {
    isoDate: string;
    dayCode: string;
    dayOfMonth: number;
} {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
    }).formatToParts(now);

    const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const month = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';
    const isoDate = `${year}-${month}-${day}`;

    const utcDate = new Date(`${isoDate}T00:00:00Z`);
    const dayCode = JS_DAY_TO_CODE[utcDate.getUTCDay()];
    const dayOfMonth = Number(day);

    return { isoDate, dayCode, dayOfMonth };
}

function daysBetweenIsoDates(startIso: string, endIso: string): number {
    const startMs = Date.parse(`${startIso}T00:00:00Z`);
    const endMs = Date.parse(`${endIso}T00:00:00Z`);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
    return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
}

function isReminderScheduledForDate(data: Record<string, any>, now = new Date()): boolean {
    if (data.isActive === false) return false;

    const { isoDate, dayCode, dayOfMonth } = getCurrentDatePartsInIST(now);
    const startDate = typeof data.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate)
        ? data.startDate
        : undefined;
    const endDate = typeof data.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.endDate)
        ? data.endDate
        : undefined;

    if (startDate && isoDate < startDate) return false;
    if (endDate && isoDate > endDate) return false;

    const frequency = data.frequency || 'daily';

    if (frequency === 'once') {
        return startDate ? isoDate === startDate : true;
    }

    if (frequency === 'weekly') {
        const daysOfWeek = Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [];
        if (daysOfWeek.length === 0) return true;
        return daysOfWeek.includes(dayCode);
    }

    if (frequency === 'custom') {
        const interval = typeof data.customInterval === 'number' && data.customInterval > 0
            ? Math.round(data.customInterval)
            : 1;
        const unit = data.customIntervalUnit || 'days';
        const anchorDate = startDate || isoDate;
        const diffDays = daysBetweenIsoDates(anchorDate, isoDate);
        if (diffDays < 0) return false;

        if (unit === 'days') {
            return diffDays % interval === 0;
        }

        if (unit === 'weeks') {
            const diffWeeks = Math.floor(diffDays / 7);
            if (diffWeeks % interval !== 0) return false;
            const daysOfWeek = Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [];
            if (daysOfWeek.length === 0) return true;
            return daysOfWeek.includes(dayCode);
        }

        if (unit === 'months') {
            const [anchorY, anchorM, anchorD] = anchorDate.split('-').map(Number);
            const [currY, currM] = isoDate.split('-').map(Number);
            const diffMonths = (currY - anchorY) * 12 + (currM - anchorM);
            if (diffMonths < 0 || diffMonths % interval !== 0) return false;
            return dayOfMonth === anchorD;
        }
    }

    return true;
}

export async function getActiveReminders(db: FirebaseFirestore.Firestore, userId: string, profileId: string, startTimeStr: string, endTimeStr: string) {
    const activeInWindow: any[] = [];
    const startMins = timeToMinutes(startTimeStr);
    const endMins = timeToMinutes(endTimeStr);

    const remindersSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("profiles")
        .doc(profileId)
        .collection("reminders")
        .get();

    remindersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!isReminderScheduledForDate(data)) {
            return;
        }

        let shouldFire = false;
        let fireTimeMinutes;
        if (data.times && data.times.length > 0) {
            // Specific times mode
            for (const t of data.times) {
                const m = timeToMinutes(t);
                if (isTimeInWindow(m, startMins, endMins)) {
                    shouldFire = true;
                    fireTimeMinutes = m;
                    break;
                }
            }
        } else if (data.interval && data.intervalUnit && data.startTime && data.endTime) {
            // Time interval mode
            const step = Math.max(1, data.intervalUnit === 'hours' ? data.interval * 60 : data.interval);
            const rStart = timeToMinutes(data.startTime);
            const rEnd = timeToMinutes(data.endTime);

            for (let m = rStart; m <= rEnd; m += step) {
                if (isTimeInWindow(m, startMins, endMins)) {
                    shouldFire = true;
                    fireTimeMinutes = m;
                    break;
                }
            }
        }

        if (shouldFire) {
            activeInWindow.push({
                id: doc.id,
                userId,
                profileId,
                path: doc.ref.path,
                ...data,
                fireTimeMinutes,
            });
        }
    });

    console.log(`[Reminders] Found ${activeInWindow.length} reminder(s) to fire.`);
    return activeInWindow;
}
