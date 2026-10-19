package androidx.media3.common;
public class PlaybackException extends Exception { public static final int ERROR_CODE_BEHIND_LIVE_WINDOW=1002; public static final int ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED=3003; public final int errorCode=0; public final String getErrorCodeName(){return "";} }
