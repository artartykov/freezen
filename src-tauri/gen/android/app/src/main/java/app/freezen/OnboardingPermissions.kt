package app.freezen

import android.Manifest
import android.app.Activity
import android.os.Build
import app.tauri.annotation.Command
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import app.tauri.PermissionState

@TauriPlugin(
    permissions = [
        Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS]),
        Permission(alias = "calendar", strings = [Manifest.permission.READ_CALENDAR])
    ]
)
class OnboardingPermissions(activity: Activity) : Plugin(activity) {
    @Command
    fun requestNotifications(invoke: Invoke) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            invoke.resolveObject(true)
        } else {
            requestPermissionForAlias("notifications", invoke, "notificationsResult")
        }
    }

    @Command
    fun requestCalendar(invoke: Invoke) {
        requestPermissionForAlias("calendar", invoke, "calendarResult")
    }

    @PermissionCallback
    fun notificationsResult(invoke: Invoke) {
        invoke.resolveObject(getPermissionState("notifications") == PermissionState.GRANTED)
    }

    @PermissionCallback
    fun calendarResult(invoke: Invoke) {
        invoke.resolveObject(getPermissionState("calendar") == PermissionState.GRANTED)
    }
}
