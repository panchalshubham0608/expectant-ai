package com.shubham.expectant_ai

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class ReminderReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "reminders"
    }

    override fun onReceive(
        context: Context,
        intent: Intent
    ) {
        val reminderId =
            intent.getStringExtra("reminder_id")
                ?: return

        val title =
            intent.getStringExtra("title")
                ?: "Expectant AI"

        val message =
            intent.getStringExtra("message")
                ?: "You have a reminder."

        createNotificationChannel(context)

        // Android 13+ requires POST_NOTIFICATIONS permission.
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val notification = NotificationCompat.Builder(
            context,
            CHANNEL_ID
        )
            .setSmallIcon(R.drawable.expectant_ai)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()

        NotificationManagerCompat
            .from(context)
            .notify(
                reminderId.hashCode(),
                notification
            )

        if (intent.getBooleanExtra("is_test_reminder", false)) {
            ReminderScheduler(context).scheduleTestReminder()
        }
    }

    private fun createNotificationChannel(
        context: Context
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Reminders",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Expectant AI reminders"
        }

        val notificationManager =
            context.getSystemService(
                NotificationManager::class.java
            )

        notificationManager.createNotificationChannel(channel)
    }
}