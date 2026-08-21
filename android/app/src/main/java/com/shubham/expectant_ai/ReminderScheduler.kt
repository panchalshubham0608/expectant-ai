package com.shubham.expectant_ai

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

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

    fun scheduleTestReminder() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                return
            }
        }

        scheduleNextTestAlarm()
    }

    private fun scheduleNextTestAlarm() {

        val intent = Intent(
            context,
            ReminderReceiver::class.java
        ).apply {
            putExtra("reminder_id", "test-reminder")
            putExtra("title", "Expectant AI")
            putExtra("message", "This is a test notification.")
            putExtra("is_test_reminder", true)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            TEST_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
        )

        val triggerAtMillis =
            System.currentTimeMillis() + INTERVAL_MILLIS

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            pendingIntent
        )
    }

    fun cancelTestReminder() {

        val intent = Intent(
            context,
            ReminderReceiver::class.java
        )

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            TEST_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.cancel(pendingIntent)
    }
}