package com.bfcam

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

private const val REMINDER_ID = 2053
private const val CHANNEL_ID = "bfcam_trial"
private const val PREFS = "bfcam_trial_reminder"

internal fun trialIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(context, REMINDER_ID,
  Intent(context, TrialReminderReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

internal fun scheduleTrialAlarm(context: Context) {
  val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  val due = prefs.getLong("due", 0); val expiry = prefs.getLong("expiry", 0)
  if (due <= System.currentTimeMillis() || expiry <= due) return
  val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due, trialIntent(context))
}

class TrialReminderModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "TrialReminderModule"
  @ReactMethod fun schedule(due: Double, expiry: Double, body: String, promise: Promise) {
    try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Pro 試用提醒", NotificationManager.IMPORTANCE_DEFAULT))
      if (!manager.areNotificationsEnabled()) {promise.resolve(false); return}
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("due", due.toLong()).putLong("expiry", expiry.toLong()).putString("body", body).apply()
      scheduleTrialAlarm(context); promise.resolve(true)
    } catch (error: Exception) {promise.reject("REMINDER_FAILED", error)}
  }
  @ReactMethod fun cancel(promise: Promise) {
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarms.cancel(trialIntent(context))
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(REMINDER_ID)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    promise.resolve(null)
  }
}

class TrialReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {scheduleTrialAlarm(context); return}
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val expiry = prefs.getLong("expiry", 0)
    if (expiry <= System.currentTimeMillis() || prefs.getLong("sent", 0) == expiry) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!manager.areNotificationsEnabled()) return
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val open = PendingIntent.getActivity(context, REMINDER_ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
    val notification = builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Pro 試用即將結束")
      .setContentText(prefs.getString("body", "請確認試用到期日與訂閱設定"))
      .setStyle(Notification.BigTextStyle().bigText(prefs.getString("body", "")))
      .setContentIntent(open).setAutoCancel(true).build()
    try {manager.notify(REMINDER_ID, notification); prefs.edit().putLong("sent", expiry).apply()} catch (_: SecurityException) { }
  }
}
