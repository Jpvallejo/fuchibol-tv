package com.fuchibol.tv;

import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
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
