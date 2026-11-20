package app.freezen

import android.app.Activity
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private const val keystoreName = "AndroidKeyStore"
private const val keyAlias = "freezen_ai_key"
private const val transformation = "AES/GCM/NoPadding"
private const val storedKey = "key_openai"
private const val ivSize = 12

@InvokeArg
class SaveKeyArgs {
    var key: String = ""
}

@TauriPlugin
class AiSecrets(activity: Activity) : Plugin(activity) {
    private val preferences =
        activity.getSharedPreferences("ai_secrets", Context.MODE_PRIVATE)

    @Command
    fun saveKey(invoke: Invoke) {
        val args = invoke.parseArgs(SaveKeyArgs::class.java)
        val cipher = Cipher.getInstance(transformation)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val encrypted = cipher.iv + cipher.doFinal(args.key.toByteArray(Charsets.UTF_8))
        preferences.edit()
            .putString(storedKey, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .apply()
        invoke.resolve()
    }

    @Command
    fun loadKey(invoke: Invoke) {
        val stored = preferences.getString(storedKey, null)
        if (stored == null) {
            invoke.reject("No API key")
            return
        }
        val bytes = Base64.decode(stored, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(transformation)
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey(),
            GCMParameterSpec(128, bytes, 0, ivSize),
        )
        val key = String(cipher.doFinal(bytes, ivSize, bytes.size - ivSize), Charsets.UTF_8)
        val result = JSObject()
        result.put("key", key)
        invoke.resolve(result)
    }

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance(keystoreName)
        store.load(null)
        (store.getKey(keyAlias, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, keystoreName)
        generator.init(
            KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }
}
