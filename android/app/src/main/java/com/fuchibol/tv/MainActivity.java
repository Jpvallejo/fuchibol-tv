package com.argentina.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Toggled from JS when an iframe stream is shown/hidden. */
    private volatile boolean iframeMode = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstaller.class);
        super.onCreate(savedInstanceState);

        // Allow media inside iframes to auto-play without a user gesture.
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

        // Expose a bridge so JS can switch iframe mode on/off and inject taps.
        getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void setIframeMode(boolean active) {
                iframeMode = active;
            }

            @JavascriptInterface
            public void tapAt(int x, int y) {
                getBridge().getWebView().post(() -> {
                    long now = android.os.SystemClock.uptimeMillis();
                    android.view.MotionEvent down = android.view.MotionEvent.obtain(
                            now, now, android.view.MotionEvent.ACTION_DOWN, x, y, 0);
                    android.view.MotionEvent up = android.view.MotionEvent.obtain(
                            now, now + 100, android.view.MotionEvent.ACTION_UP, x, y, 0);
                    getBridge().getWebView().dispatchTouchEvent(down);
                    getBridge().getWebView().postDelayed(
                            () -> getBridge().getWebView().dispatchTouchEvent(up), 100);
                    down.recycle();
                    up.recycle();
                });
            }
        }, "NativeBridge");
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // While an iframe is on screen let Android handle events natively.
        // This routes D-pad keys into the iframe content and restores the
        // system pointer cursor.
        if (iframeMode) {
            return super.dispatchKeyEvent(event);
        }

        if (event.getAction() != KeyEvent.ACTION_DOWN) {
            return super.dispatchKeyEvent(event);
        }

        String jsKey = null;

        switch (event.getKeyCode()) {
            case KeyEvent.KEYCODE_DPAD_UP:       jsKey = "ArrowUp";     break;
            case KeyEvent.KEYCODE_DPAD_DOWN:     jsKey = "ArrowDown";   break;
            case KeyEvent.KEYCODE_DPAD_LEFT:     jsKey = "ArrowLeft";   break;
            case KeyEvent.KEYCODE_DPAD_RIGHT:    jsKey = "ArrowRight";  break;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:         jsKey = "Enter";       break;
            case KeyEvent.KEYCODE_BACK:          jsKey = "GoBack";      break;
            case KeyEvent.KEYCODE_CHANNEL_UP:    jsKey = "ChannelUp";   break;
            case KeyEvent.KEYCODE_CHANNEL_DOWN:  jsKey = "ChannelDown"; break;
        }

        if (jsKey != null) {
            final String key = jsKey;
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "document.dispatchEvent(new KeyboardEvent('keydown', {key:'" + key + "',bubbles:true}))",
                    null
                )
            );
            return true; // consumed — prevents back from exiting app
        }

        return super.dispatchKeyEvent(event);
    }
}
