package app.freezen

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.ByteArrayOutputStream
import kotlin.math.log10
import kotlin.math.sqrt

private const val sampleRate = 24000
private const val readMillis = 50
private const val quietDb = -50.0
private const val loudDb = -10.0

@InvokeArg
class GenerationArgs {
    var generation: Int = -1
}

@TauriPlugin(
    permissions = [
        Permission(alias = "microphone", strings = [Manifest.permission.RECORD_AUDIO])
    ]
)
class MicCapture(activity: Activity) : Plugin(activity) {
    private val lock = Any()
    private val pending = ByteArrayOutputStream()
    @Volatile private var recorder: AudioRecord? = null
    @Volatile private var level = 0.0
    private var worker: Thread? = null
    private var generation = 0

    @Command
    fun start(invoke: Invoke) {
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
    fun read(invoke: Invoke) {
        val asked = invoke.parseArgs(GenerationArgs::class.java).generation
        val bytes = if (asked != generation) ByteArray(0) else synchronized(lock) {
            val chunk = pending.toByteArray()
            pending.reset()
            chunk
        }
        val result = JSObject()
        result.put("audio", Base64.encodeToString(bytes, Base64.NO_WRAP))
        result.put("level", level)
        invoke.resolve(result)
    }

    @Command
    fun stop(invoke: Invoke) {
        if (invoke.parseArgs(GenerationArgs::class.java).generation == generation) release()
        invoke.resolve()
    }

    @SuppressLint("MissingPermission")
    private fun begin(invoke: Invoke) {
        release()
        val minimum = AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        val chunkBytes = sampleRate * 2 * readMillis / 1000
        val created = try {
            AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                maxOf(minimum, chunkBytes * 4),
            )
        } catch (error: Exception) {
            invoke.reject("Microphone unavailable: ${error.message}")
            return
        }
        if (created.state != AudioRecord.STATE_INITIALIZED) {
            created.release()
            invoke.reject("Microphone unavailable")
            return
        }
        synchronized(lock) { pending.reset() }
        level = 0.0
        recorder = created
        created.startRecording()
        worker = Thread {
            val buffer = ByteArray(chunkBytes)
            while (recorder === created) {
                val count = created.read(buffer, 0, buffer.size)
                if (count <= 0) continue
                level = levelOf(buffer, count)
                synchronized(lock) { pending.write(buffer, 0, count) }
            }
        }.also { it.start() }
        generation += 1
        val result = JSObject()
        result.put("generation", generation)
        invoke.resolve(result)
    }

    private fun release() {
        val current = recorder ?: return
        recorder = null
        worker?.join(500)
        worker = null
        try {
            current.stop()
        } catch (_: IllegalStateException) {
        }
        current.release()
        level = 0.0
    }

    private fun levelOf(buffer: ByteArray, count: Int): Double {
        var sum = 0.0
        val samples = count / 2
        for (index in 0 until samples) {
            val low = buffer[index * 2].toInt() and 0xff
            val high = buffer[index * 2 + 1].toInt()
            val sample = (high shl 8) or low
            sum += sample.toDouble() * sample
        }
        val rms = sqrt(sum / maxOf(samples, 1)) / 32768.0
        val db = if (rms > 0) 20 * log10(rms) else quietDb
        return ((db - quietDb) / (loudDb - quietDb)).coerceIn(0.0, 1.0)
    }
}
