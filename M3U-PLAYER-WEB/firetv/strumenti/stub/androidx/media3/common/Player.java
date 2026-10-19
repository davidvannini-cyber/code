package androidx.media3.common;
public interface Player { int STATE_BUFFERING=2; int STATE_READY=3;
 interface Listener { default void onPlaybackStateChanged(int s){} default void onPlayerError(PlaybackException e){} }
 void addListener(Listener l); void setMediaItem(MediaItem m); void prepare(); void setPlayWhenReady(boolean b); boolean getPlayWhenReady(); int getPlaybackState(); void stop(); void release(); void seekToDefaultPosition(); }
