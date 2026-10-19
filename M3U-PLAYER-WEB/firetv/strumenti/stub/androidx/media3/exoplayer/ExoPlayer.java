package androidx.media3.exoplayer;
import androidx.media3.common.*;
public interface ExoPlayer extends Player { androidx.media3.common.Format getVideoFormat(); void setVideoSurfaceView(android.view.SurfaceView v);
 final class Builder { public Builder(android.content.Context c){} public Builder setMediaSourceFactory(androidx.media3.exoplayer.source.DefaultMediaSourceFactory f){return this;} public Builder setLoadControl(DefaultLoadControl l){return this;} public ExoPlayer build(){return null;} } }
