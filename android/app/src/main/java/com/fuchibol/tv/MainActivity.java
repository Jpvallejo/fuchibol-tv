package com.argentina.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

        // Intercept MPD requests and proxy them natively so we can control headers
        getBridge().getWebView().setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url == null || !url.toLowerCase().contains(".mpd")) {
                    return super.shouldInterceptRequest(view, request);
                }

                try {
                    HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);

                    Map<String, String> reqHeaders = request.getRequestHeaders();
                    if (reqHeaders != null) {
                        for (Map.Entry<String, String> h : reqHeaders.entrySet()) {
                            if (h.getKey() != null && h.getValue() != null) {
                                conn.setRequestProperty(h.getKey(), h.getValue());
                            }
                        }
                    }

                    // Override/ensure the required proxy headers
                    try {
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
                        conn.setRequestProperty("Referer", "https://portal.app.flow.com.ar/");
                        conn.setRequestProperty("Origin", "https://portal.app.flow.com.ar");
                        String host = conn.getURL() != null ? conn.getURL().getHost() : new URL(url).getHost();
                        conn.setRequestProperty("Host", host);
                        conn.setRequestProperty("Accept", "*/*");
                    } catch (Exception _ex) {
                        // ignore
                    }

                    conn.connect();
                    int status = conn.getResponseCode();
                    InputStream is = status >= 400 ? conn.getErrorStream() : conn.getInputStream();

                    String contentType = conn.getContentType();
                    String mime = null;
                    String encoding = null;
                    if (contentType != null) {
                        String[] parts = contentType.split(";");
                        mime = parts[0].trim();
                        for (String p : parts) {
                            p = p.trim();
                            if (p.toLowerCase().startsWith("charset=")) {
                                encoding = p.substring(8);
                            }
                        }
                    }

                    Map<String, List<String>> headerFields = conn.getHeaderFields();
                    Map<String, String> responseHeaders = new HashMap<>();
                    if (headerFields != null) {
                        for (Map.Entry<String, List<String>> e : headerFields.entrySet()) {
                            String key = e.getKey();
                            List<String> vals = e.getValue();
                            if (key != null && vals != null && !vals.isEmpty()) {
                                responseHeaders.put(key, vals.get(0));
                            }
                        }
                    }

                    String message = conn.getResponseMessage();
                    if (mime == null) mime = "application/dash+xml";

                    return new WebResourceResponse(mime, encoding, status, message, responseHeaders, is);
                } catch (Exception ex) {
                    ex.printStackTrace();
                    return super.shouldInterceptRequest(view, request);
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                // Fallback for older APIs
                if (url == null || !url.toLowerCase().contains(".mpd")) {
                    return super.shouldInterceptRequest(view, url);
                }
                try {
                    HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);

                    // Ensure proxy headers are present
                    try {
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
                        conn.setRequestProperty("Referer", "https://portal.app.flow.com.ar/");
                        conn.setRequestProperty("Origin", "https://portal.app.flow.com.ar");
                        String host = new URL(url).getHost();
                        conn.setRequestProperty("Host", host);
                        conn.setRequestProperty("Accept", "*/*");
                    } catch (Exception _ex) {
                        // ignore
                    }

                    conn.connect();
                    int status = conn.getResponseCode();
                    InputStream is = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
                    String contentType = conn.getContentType();
                    String mime = contentType != null ? contentType.split(";")[0].trim() : "application/dash+xml";
                    return new WebResourceResponse(mime, null, is);
                } catch (Exception ex) {
                    ex.printStackTrace();
                    return super.shouldInterceptRequest(view, url);
                }
            }
        });
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
