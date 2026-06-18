package com.argentina.tv;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstaller extends Plugin {

    private DownloadManager downloadManager;
    private long activeDownloadId = -1;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        Context context = getContext();
        downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);

        File downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloadDir == null) {
            call.reject("External storage not available");
            return;
        }

        File outputFile = new File(downloadDir, "argentina-tv-update.apk");
        if (outputFile.exists()) outputFile.delete();

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
            .setTitle("Argentina TV")
            .setDescription("Descargando actualización...")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, "argentina-tv-update.apk")
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true);

        activeDownloadId = downloadManager.enqueue(request);

        JSObject result = new JSObject();
        result.put("downloadId", activeDownloadId);
        call.resolve(result);

        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != activeDownloadId) return;

                ctx.unregisterReceiver(this);

                Cursor cursor = downloadManager.query(new DownloadManager.Query().setFilterById(id));
                if (cursor != null && cursor.moveToFirst()) {
                    int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    cursor.close();
                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        installApk(ctx, outputFile);
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            context.registerReceiver(receiver, filter);
        }
    }

    @PluginMethod
    public void checkProgress(PluginCall call) {
        if (activeDownloadId == -1 || downloadManager == null) {
            call.reject("No active download");
            return;
        }

        Cursor cursor = downloadManager.query(new DownloadManager.Query().setFilterById(activeDownloadId));
        if (cursor != null && cursor.moveToFirst()) {
            long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            cursor.close();

            JSObject result = new JSObject();
            result.put("downloaded", downloaded);
            result.put("total", total);
            result.put("percent", total > 0 ? (int) (downloaded * 100 / total) : -1);
            result.put("status", status);
            call.resolve(result);
        } else {
            if (cursor != null) cursor.close();
            call.reject("Download not found");
        }
    }

    private void installApk(Context context, File apkFile) {
        Uri uri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );
        Intent install = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(install);
    }
}
