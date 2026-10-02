package com.aralabs.komyx.kiosk

import android.app.admin.DeviceAdminReceiver

/** Empty receiver: its presence is what allows `dpm set-device-owner` to target this app. */
class KioskDeviceAdminReceiver : DeviceAdminReceiver()
