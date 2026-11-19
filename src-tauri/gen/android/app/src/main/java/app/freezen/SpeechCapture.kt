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
private const val silenceFloorDb = -2f
private const val loudRangeDb = 12f

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
    private var listening = false
    private var stopping = false
    private var committed = ""
    private var partial = ""
    private var level = 0f
    private var failure: String? = null

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
        result.put("text", (committed + " " + partial).trim())
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

    private fun begin(invoke: Invoke) {
        handler.post {
            release()
            committed = ""
            partial = ""
            level = 0f
            failure = null
            stopping = false
            listening = true
            recognizer = SpeechRecognizer.createSpeechRecognizer(host).also {
                it.setRecognitionListener(listener)
            }
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
        recognizer?.destroy()
        recognizer = null
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

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
        override fun onEndOfSpeech() {}

        override fun onRmsChanged(rmsdB: Float) {
            level = ((rmsdB - silenceFloorDb) / loudRangeDb).coerceIn(0f, 1f)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            partial = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
        }

        override fun onResults(results: Bundle?) {
            commit(results)
            if (listening) {
                handler.postDelayed({ if (listening) listen() }, restartDelayMillis)
            } else {
                finish()
            }
        }

        override fun onError(error: Int) {
            val recoverable =
                error == SpeechRecognizer.ERROR_NO_MATCH ||
                    error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
            if (recoverable && listening) {
                partial = ""
                handler.postDelayed({ if (listening) listen() }, restartDelayMillis)
            } else {
                if (!recoverable) failure = error.toString()
                finish()
            }
        }
    }
}
