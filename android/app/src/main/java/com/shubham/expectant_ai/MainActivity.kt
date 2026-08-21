package com.shubham.expectant_ai;

import android.Manifest
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    companion object {
        private const val TAG = "ExpectantAI"
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 100
    }

    private lateinit var webView: WebView

    private lateinit var reminderScheduler: ReminderScheduler

    private lateinit var googleAuthManager: GoogleAuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView.setWebContentsDebuggingEnabled(true)

        reminderScheduler = ReminderScheduler(this)

        googleAuthManager = GoogleAuthManager(this)

        setupWebView()

        requestNotificationPermission()
    }

    private fun setupWebView() {

        webView = WebView(this)

        val assetLoader =
            WebViewAssetLoader.Builder()
                .addPathHandler(
                    "/assets/",
                    WebViewAssetLoader.AssetsPathHandler(this)
                )
                .build()

        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {

                Log.d(
                    TAG,
                    "Loading: ${request.url}"
                )

                return assetLoader.shouldInterceptRequest(
                    request.url
                )
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: android.webkit.WebResourceError
            ) {
                super.onReceivedError(
                    view,
                    request,
                    error
                )

                Log.e(
                    TAG,
                    "WebView error: ${request.url} - ${error.description}"
                )
            }

            override fun onPageFinished(
                view: WebView,
                url: String
            ) {
                super.onPageFinished(
                    view,
                    url
                )

                Log.d(
                    TAG,
                    "Page finished: $url"
                )
            }
        }

        webView.webChromeClient =
            WebChromeClient()

        webView.settings.apply {

            javaScriptEnabled = true

            domStorageEnabled = true

            allowFileAccess = false

            allowContentAccess = false

            allowFileAccessFromFileURLs = false

            allowUniversalAccessFromFileURLs = false
        }

        /*
         * Expose our native API to the React application.
         *
         * React can call:
         *
         * window.Android.signInWithGoogle()
         *
         * window.Android.scheduleReminder(...)
         */
        webView.addJavascriptInterface(
            AndroidBridge(
                this,
                reminderScheduler,
                googleAuthManager
            ),
            "Android"
        )

        /*
         * React application bundled inside the APK.
         */
        webView.loadUrl(
            "https://appassets.androidplatform.net/assets/web/index.html"
        )

        setContentView(webView)
    }

    /**
     * Called by AndroidBridge when native Google authentication
     * succeeds.
     *
     * The Google ID token is sent into the React application.
     */
    fun sendGoogleTokenToWebView(
        idToken: String
    ) {

        val escapedToken =
            JSONObject.quote(idToken)

        val javascript = """
            window.dispatchEvent(
                new CustomEvent(
                    "nativeGoogleSignIn",
                    {
                        detail: {
                            idToken: $escapedToken
                        }
                    }
                )
            );
        """.trimIndent()

        runOnUiThread {

            webView.evaluateJavascript(
                javascript,
                null
            )
        }
    }

    /**
     * Called by AndroidBridge if native Google authentication fails.
     */
    fun sendGoogleAuthError(
        message: String
    ) {

        val escapedMessage =
            JSONObject.quote(message)

        val javascript = """
            window.dispatchEvent(
                new CustomEvent(
                    "nativeGoogleSignInError",
                    {
                        detail: {
                            message: $escapedMessage
                        }
                    }
                )
            );
        """.trimIndent()

        runOnUiThread {

            webView.evaluateJavascript(
                javascript,
                null
            )
        }
    }

    private fun requestNotificationPermission() {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.TIRAMISU
        ) {

            if (
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(
                        Manifest.permission.POST_NOTIFICATIONS
                    ),
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                )
            }
        }
    }

    /**
     * Opens Android's Exact Alarm settings page.
     */
    fun requestExactAlarmPermission() {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.S
        ) {

            val alarmManager =
                getSystemService(
                    AlarmManager::class.java
                )

            if (
                !alarmManager.canScheduleExactAlarms()
            ) {

                val intent = Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse(
                        "package:$packageName"
                    )
                )

                startActivity(intent)
            }
        }
    }

    override fun onDestroy() {

        webView.apply {

            removeJavascriptInterface(
                "Android"
            )

            stopLoading()

            destroy()
        }

        super.onDestroy()
    }
}