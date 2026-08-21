package com.shubham.expectant_ai

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GoogleAuthManager(
    private val context: Context
) {

    companion object {
        private const val TAG = "GoogleAuthManager"
    }

    private val auth = FirebaseAuth.getInstance()

    private val credentialManager =
        CredentialManager.create(context)

    fun signIn(
        onSuccess: (String) -> Unit,
        onFailure: (Exception) -> Unit
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val googleIdOption =
                    GetGoogleIdOption.Builder()
                        .setServerClientId(
                            context.getString(
                                R.string.default_web_client_id
                            )
                        )
                        .setFilterByAuthorizedAccounts(false)
                        .build()

                val request =
                    GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()

                Log.d(
                    TAG,
                    "Requesting Google credential with client ID: ${
                        context.getString(
                            R.string.default_web_client_id
                        )
                    }"
                )
                val result =
                    credentialManager.getCredential(
                        context,
                        request
                    )
                Log.d(TAG, "Credential Manager returned successfully")

                val credential = result.credential

                if (
                    credential is CustomCredential &&
                    credential.type ==
                    GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {

                    val googleCredential =
                        GoogleIdTokenCredential
                            .createFrom(credential.data)

                    val firebaseCredential =
                        GoogleAuthProvider.getCredential(
                            googleCredential.idToken,
                            null
                        )

                    auth.signInWithCredential(
                        firebaseCredential
                    ).addOnCompleteListener { task ->

                        if (task.isSuccessful) {

                            Log.d(
                                TAG,
                                "Firebase sign-in successful: " +
                                        "${auth.currentUser?.email}"
                            )

                            // Send the Google ID token to the web app, NOT the Firebase ID token
                            onSuccess(googleCredential.idToken)

                        } else {
                            onFailure(
                                task.exception
                                    ?: Exception(
                                        "Firebase sign-in failed"
                                    )
                            )
                        }
                    }

                } else {
                    onFailure(
                        Exception(
                            "Unexpected credential type"
                        )
                    )
                }

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "Google sign-in failed",
                    e
                )

                onFailure(e)
            }
        }
    }
}