package com.aralabs.komyx.kiosk

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lock-task ("kiosk") control for the Komyx tablet.
 *
 * - As device owner (tablet provisioned by AraLabs): startLockTask pins the app silently; home,
 *   recents and notifications are blocked until stopLockTask.
 * - Otherwise Android shows its own "pin this app?" confirmation and the user can unpin with the
 *   back+recents gesture, so the PIN screen inside the app is the real gate.
 */
class KioskModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  private val dpm: DevicePolicyManager
    get() = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  private val admin: ComponentName
    get() = ComponentName(context, KioskDeviceAdminReceiver::class.java)

  override fun definition() = ModuleDefinition {
    Name("Kiosk")

    Function("isDeviceOwner") { dpm.isDeviceOwnerApp(context.packageName) }

    Function("isLockTaskPermitted") { dpm.isLockTaskPermitted(context.packageName) }

    Function("isInLockTask") {
      val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    }

    Function("startLockTask") {
      val activity = appContext.currentActivity ?: return@Function false
      if (dpm.isDeviceOwnerApp(context.packageName)) {
        dpm.setLockTaskPackages(admin, arrayOf(context.packageName))
      }
      activity.runOnUiThread { activity.startLockTask() }
      true
    }

    Function("stopLockTask") {
      val activity = appContext.currentActivity ?: return@Function false
      activity.runOnUiThread { activity.stopLockTask() }
      true
    }
  }
}
