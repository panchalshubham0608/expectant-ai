
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

export async function getActiveReminders(db: FirebaseFirestore.Firestore, userId: string, profileId: string, startTimeStr: string, endTimeStr: string) {
    const activeInWindow: any[] = [];
    const startMins = timeToMinutes(startTimeStr);
    const endMins = timeToMinutes(endTimeStr);

    console.log(`[Reminders] Fetching active reminders for user ${userId}, profile ${profileId} between ${startTimeStr} and ${endTimeStr}...`);
    const remindersSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("profiles")
        .doc(profileId)
        .collection("reminders")
        .get();

    remindersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
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
