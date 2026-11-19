package app.freezen

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.File
import java.io.InputStream
import java.net.URL
import java.security.DigestInputStream
import java.security.MessageDigest
import java.util.concurrent.Executors
import javax.net.ssl.HttpsURLConnection
import org.json.JSONObject

private const val releases = "https://api.github.com/repos/artartykov/freezen/releases/latest"
private const val downloads = "https://github.com/artartykov/freezen/releases/download"
private val stableVersion = Regex("(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)")

@TauriPlugin
class AppUpdates(private val host: Activity) : Plugin(host) {
    private val worker = Executors.newSingleThreadExecutor()
    private var availableUpdate: Update? = null

    @Command
    fun supportsUpdates(invoke: Invoke) {
        invoke.resolveObject(isSupported())
    }

    @Command
    fun checkForUpdate(invoke: Invoke) {
        if (!isSupported()) {
            invoke.resolve()
            return
        }

        runInBackground(invoke) {
            availableUpdate = latestUpdate()
            val version = availableUpdate?.version
            if (version == null) invoke.resolve() else invoke.resolveObject(version)
        }
    }

    @Command
    fun installUpdate(invoke: Invoke) {
        if (!isSupported()) {
            invoke.reject("Updates are unavailable for this build")
            return
        }

        if (canInstall()) {
            prepareInstaller(invoke)
        } else {
            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${host.packageName}"))
            startActivityForResult(invoke, intent, "installPermissionResult")
        }
    }

    @ActivityCallback
    fun installPermissionResult(invoke: Invoke, result: ActivityResult) {
        if (canInstall()) prepareInstaller(invoke) else invoke.resolveObject(false)
    }

    private fun isSupported(): Boolean =
        BuildConfig.APPLICATION_ID == "app.freezen" && !BuildConfig.DEBUG && "arm64-v8a" in Build.SUPPORTED_ABIS

    private fun canInstall(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || host.packageManager.canRequestPackageInstalls()

    private fun latestUpdate(): Update? {
        val release = request(releases, "application/vnd.github+json") { input ->
            JSONObject(input.bufferedReader().readText())
        }
        val tag = release.getString("tag_name")
        val version = tag.removePrefix("v")
        if (release.optBoolean("draft") || release.optBoolean("prerelease") || tag == version || !isNewer(version)) {
            return null
        }

        val name = "freezen-$tag-arm64.apk"
        val url = "$downloads/$tag/$name"
        val assets = release.getJSONArray("assets")
        for (index in 0 until assets.length()) {
            val asset = assets.getJSONObject(index)
            val size = asset.optLong("size")
            if (asset.optString("name") == name && asset.optString("browser_download_url") == url && size > 0) {
                val digest = asset.optString("digest").takeIf { it.startsWith("sha256:") }?.removePrefix("sha256:")
                return Update(version, url, size, digest)
            }
        }
        return null
    }

    private fun isNewer(version: String): Boolean {
        val next = versionParts(version) ?: return false
        val current = versionParts(BuildConfig.VERSION_NAME) ?: return false
        return next.zip(current).firstOrNull { (offered, installed) -> offered != installed }
            ?.let { (offered, installed) -> offered > installed } ?: false
    }

    private fun versionParts(version: String): List<Int>? {
        if (!stableVersion.matches(version)) return null
        return version.split('.').map { it.toIntOrNull() ?: return null }
    }

    private fun prepareInstaller(invoke: Invoke) {
        runInBackground(invoke) {
            val version = invoke.getArgs().getString("version")
            val update = requireNotNull(availableUpdate?.takeIf { it.version == version })
            val apk = download(update)
            val uri = FileProvider.getUriForFile(host, "${host.packageName}.fileprovider", apk)
            val intent = Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            host.runOnUiThread {
                try {
                    host.startActivity(intent)
                    invoke.resolveObject(true)
                } catch (error: Exception) {
                    invoke.reject("Could not open Android installer", error)
                }
            }
        }
    }

    private fun download(update: Update): File {
        val directory = File(host.cacheDir, "updates").apply { mkdirs() }
        val temporary = File.createTempFile("freezen-", ".apk", directory)
        val hash = MessageDigest.getInstance("SHA-256")
        try {
            request(update.url, "application/octet-stream") { input ->
                val copied = temporary.outputStream().use { output -> DigestInputStream(input, hash).copyTo(output) }
                check(copied == update.size)
            }
            if (update.digest != null) {
                val downloaded = hash.digest().joinToString("") { "%02x".format(it) }
                check(downloaded.equals(update.digest, ignoreCase = true))
            }
            val apkInfo = requireNotNull(host.packageManager.getPackageArchiveInfo(temporary.absolutePath, 0))
            check(apkInfo.packageName == host.packageName && apkInfo.versionName == update.version)
            val apk = File(directory, "freezen-update.apk")
            check(temporary.renameTo(apk))
            return apk
        } finally {
            temporary.delete()
        }
    }

    private fun runInBackground(invoke: Invoke, action: () -> Unit) {
        worker.execute {
            try {
                action()
            } catch (error: Exception) {
                invoke.reject("Android update failed", error)
            }
        }
    }

    private fun <T> request(url: String, type: String, read: (InputStream) -> T): T {
        val connection = URL(url).openConnection() as HttpsURLConnection
        return try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 20_000
            connection.setRequestProperty("Accept", type)
            connection.setRequestProperty("User-Agent", "FreeZen/${BuildConfig.VERSION_NAME}")
            check(connection.responseCode == HttpsURLConnection.HTTP_OK)
            connection.inputStream.use(read)
        } finally {
            connection.disconnect()
        }
    }

    private data class Update(val version: String, val url: String, val size: Long, val digest: String?)
}
