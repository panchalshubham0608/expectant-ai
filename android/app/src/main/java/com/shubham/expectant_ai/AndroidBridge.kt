package com.shubham.expectant_ai

import android.webkit.JavascriptInterface

class AndroidBridge(
    private val activity: MainActivity,
    private val scheduler: ReminderScheduler,
    private val googleAuthManager : GoogleAuthManager,
) {

    @JavascriptInterface
    fun signInWithGoogle() {
        googleAuthManager.signIn(
            onSuccess = { googleIdToken ->

                activity.runOnUiThread {
                    activity.sendGoogleTokenToWebView(
                        googleIdToken
                    )
                }
            },
            onFailure = { error ->

                activity.runOnUiThread {
                    activity.sendGoogleAuthError(
                        error.message ?: "Google sign-in failed"
                    )
                }
            }
        )
    }

    @JavascriptInterface
    fun scheduleReminder(
        id: String,
        title: String,
        message: String,
        scheduledAtMillis: Long
    ) {
        scheduler.schedule(
            Reminder(
                id,
                title,
                message,
                scheduledAtMillis
            )
        )
    }
}