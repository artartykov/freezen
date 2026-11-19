package app.freezen

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

private const val restartDelayMillis = 150L
private const val recoverDelayMillis = 400L
private const val maxRecoveries = 3
private const val silenceFloorDb = -2f
private const val loudRangeDb = 12f

private val transientErrors = setOf(
    SpeechRecognizer.ERROR_SERVER_DISCONNECTED,
    SpeechRecognizer.ERROR_CLIENT,
    SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
)

@InvokeArg
class StartSpeechArgs {
    var language: String = "en-US"
}

@TauriPlugin(
    permissions = [
        Permission(alias = "microphone", strings = [Manifest.permission.RECORD_AUDIO])
    ]
)
class SpeechCapture(private val host: Activity) : Plugin(host) {
    private val handler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var language = "en-US"
    @Volatile private var listening = false
    @Volatile private var stopping = false
    @Volatile private var committed = ""
    @Volatile private var partial = ""
    @Volatile private var level = 0f
    @Volatile private var failure: String? = null
    private var session = 0
    private var recoveries = 0

    @Command
    fun isAvailable(invoke: Invoke) {
        invoke.resolveObject(SpeechRecognizer.isRecognitionAvailable(host))
    }

    @Command
    fun start(invoke: Invoke) {
        language = invoke.parseArgs(StartSpeechArgs::class.java).language
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            begin(invoke)
        } else {
            requestPermissionForAlias("microphone", invoke, "microphoneResult")
        }
    }

    @PermissionCallback
    fun microphoneResult(invoke: Invoke) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            begin(invoke)
        } else {
            invoke.reject("Microphone permission denied")
        }
    }

    @Command
    fun poll(invoke: Invoke) {
        val result = JSObject()
        result.put("final", committed)
        result.put("partial", partial)
        result.put("level", level.toDouble())
        result.put("active", listening || stopping)
        result.put("error", failure)
        invoke.resolve(result)
    }

    @Command
    fun stop(invoke: Invoke) {
        handler.post {
            if (listening) {
                listening = false
                stopping = true
                recognizer?.stopListening()
            }
        }
        invoke.resolve()
    }

    @Command
    fun cancel(invoke: Invoke) {
        handler.post {
            release()
            finish()
        }
        invoke.resolve()
    }

    private fun begin(invoke: Invoke) {
        handler.post {
            session += 1
            recognizer?.cancel()
            committed = ""
            partial = ""
            level = 0f
            failure = null
            stopping = false
            listening = true
            recoveries = 0
            val current = recognizer ?: create().also { recognizer = it }
            current.setRecognitionListener(listenerFor(session))
            listen()
            invoke.resolve()
        }
    }

    private fun listen() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        recognizer?.startListening(intent)
    }

    private fun release() {
        session += 1
        recognizer?.destroy()
        recognizer = null
    }

    private fun create() = SpeechRecognizer.createSpeechRecognizer(host)

    private fun recover() {
        recoveries += 1
        session += 1
        val owner = session
        recognizer?.destroy()
        recognizer = null
        handler.postDelayed({
            if (owner == session && listening) {
                recognizer = create().also { it.setRecognitionListener(listenerFor(owner)) }
                listen()
            }
        }, recoverDelayMillis)
    }

    private fun restartLater(owner: Int) {
        handler.postDelayed({ if (owner == session && listening) listen() }, restartDelayMillis)
    }

    private fun finish() {
        listening = false
        stopping = false
        level = 0f
    }

    private fun commit(results: Bundle?) {
        val text = results
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
            .orEmpty()
        partial = ""
        if (text.isNotBlank()) committed = (committed + " " + text).trim()
    }

    private fun listenerFor(owner: Int) = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
        override fun onEndOfSpeech() {}

        override fun onRmsChanged(rmsdB: Float) {
            if (owner != session) return
            level = ((rmsdB - silenceFloorDb) / loudRangeDb).coerceIn(0f, 1f)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            if (owner != session) return
            recoveries = 0
            partial = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
        }

        override fun onResults(results: Bundle?) {
            if (owner != session) return
            recoveries = 0
            commit(results)
            if (listening) restartLater(owner) else finish()
        }

        override fun onError(error: Int) {
            if (owner != session) return
            when {
                !listening -> finish()
                error == SpeechRecognizer.ERROR_NO_MATCH ||
                    error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                    partial = ""
                    restartLater(owner)
                }
                error in transientErrors && recoveries < maxRecoveries -> recover()
                else -> {
                    failure = describe(error)
                    finish()
                }
            }
        }
    }

    private fun describe(error: Int): String {
        val reason = when (error) {
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network timeout"
            SpeechRecognizer.ERROR_NETWORK -> "network error"
            SpeechRecognizer.ERROR_AUDIO -> "audio recording error"
            SpeechRecognizer.ERROR_SERVER -> "server error"
            SpeechRecognizer.ERROR_CLIENT -> "client error"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "recognizer busy"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "no microphone permission"
            SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "too many requests"
            SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "recognition service disconnected"
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "language not supported"
            SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "language unavailable"
            else -> "unknown error"
        }
        return "Speech recognition: $reason ($error)"
    }
}
