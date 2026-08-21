package com.shubham.expectant_ai

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class ReminderScheduler(
    private val context: Context
) {

    companion object {
        private const val TEST_REQUEST_CODE = 9999
        private const val INTERVAL_MILLIS = 60_000L
    }

    private val alarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun schedule(reminder: Reminder): Boolean {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                return false
            }
        }

        val intent = Intent(
            context,
            ReminderReceiver::class.java
        ).apply {
            putExtra("reminder_id", reminder.id)
            putExtra("title", reminder.title)
            putExtra("message", reminder.message)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminder.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            reminder.scheduledAtMillis,
            pendingIntent
        )

        return true
    }

    fun scheduleTestNotification(context: Context) {
        val alarmManager =
            context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("title", "Test Notification")
            putExtra("message", "This is a test notification from Expectant AI.")
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            12345,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
        )

        val triggerTime =
            System.currentTimeMillis() + 5_000L

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            !alarmManager.canScheduleExactAlarms()
        ) {
            Log.e(
                "ReminderScheduler",
                "Exact alarm permission not granted"
            )
            return
        }

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerTime,
            pendingIntent
        )

        Log.d(
            "ReminderScheduler",
            "Test notification scheduled for 5 seconds"
        )
    }
}