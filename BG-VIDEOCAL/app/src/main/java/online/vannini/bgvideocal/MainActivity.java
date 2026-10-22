package online.vannini.bgvideocal;

import android.Manifest;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import android.graphics.Matrix;

import android.graphics.SurfaceTexture;
import android.media.MediaPlayer;
import android.net.Uri;

import android.os.Bundle;

import android.util.Size;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.lifecycle.ProcessCameraProvider;

import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.segmentation.Segmentation;
import com.google.mlkit.vision.segmentation.SegmentationMask;
import com.google.mlkit.vision.segmentation.Segmenter;
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions;

import java.io.InputStream;

import java.nio.FloatBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fotocamera + ritaglio della persona (ML Kit) + sfondo a scelta: sfocato, immagine o video.
 * Sotto c'è lo sfondo, sopra la persona con il contorno trasparente.
 */
public class MainActivity extends ComponentActivity {
    private static final int REQ_CAMERA = 1, REQ_IMAGE = 2, REQ_VIDEO = 3;
    private static final int BLUR = 0, IMAGE = 1, VIDEO = 2;

    private ImageView bgImage, person;
    private TextureView bgVideo;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private Segmenter segmenter;
    private ProcessCameraProvider provider;
    private int lens = CameraSelector.LENS_FACING_FRONT;

    private volatile int mode = BLUR;
    private volatile Bitmap lastPerson, lastBlur, pickedImage;
    private MediaPlayer player;
    private Uri videoUri;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_main);
        bgImage = findViewById(R.id.bgImage);
        bgVideo = findViewById(R.id.bgVideo);
        person = findViewById(R.id.person);

        segmenter = Segmentation.getClient(new SelfieSegmenterOptions.Builder()
                .setDetectorMode(SelfieSegmenterOptions.STREAM_MODE).build());

        findViewById(R.id.btnBlur).setSelected(true);
        findViewById(R.id.btnBlur).setOnClickListener(v -> setMode(BLUR));
        findViewById(R.id.btnImage).setOnClickListener(v -> pick("image/*", REQ_IMAGE));
        findViewById(R.id.btnVideo).setOnClickListener(v -> pick("video/*", REQ_VIDEO));
        findViewById(R.id.btnFlip).setOnClickListener(v -> {
            lens = lens == CameraSelector.LENS_FACING_FRONT
                    ? CameraSelector.LENS_FACING_BACK : CameraSelector.LENS_FACING_FRONT;
            bindCamera();
        });

        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == REQ_CAMERA && res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            Toast.makeText(this, "Serve il permesso della fotocamera", Toast.LENGTH_LONG).show();
        }
    }

    // ---- scelta dello sfondo ----

    private void pick(String type, int req) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type);
        startActivityForResult(i, req);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (res != RESULT_OK || data == null || data.getData() == null) return;
        Uri u = data.getData();
        try {
            if (req == REQ_IMAGE) {
                Bitmap bmp;
                try (InputStream in = getContentResolver().openInputStream(u)) {
                    bmp = BitmapFactory.decodeStream(in);
                }
                if (bmp == null) throw new IllegalStateException("immagine non leggibile");
                pickedImage = bmp;
                setMode(IMAGE);
            } else if (req == REQ_VIDEO) {
                videoUri = u;
                setMode(VIDEO);
            }
        } catch (Exception e) {
            Toast.makeText(this, "Non riesco ad aprire il file", Toast.LENGTH_LONG).show();
        }
    }

    private void setMode(int m) {
        mode = m;
        stopVideo();
        bgImage.setVisibility(m == VIDEO ? View.GONE : View.VISIBLE);
        bgVideo.setVisibility(m == VIDEO ? View.VISIBLE : View.GONE);
        if (m == IMAGE) bgImage.setImageBitmap(pickedImage);
        if (m == BLUR) bgImage.setImageBitmap(lastBlur);
        if (m == VIDEO) startVideo();
        findViewById(R.id.btnBlur).setSelected(m == BLUR);
        findViewById(R.id.btnImage).setSelected(m == IMAGE);
        findViewById(R.id.btnVideo).setSelected(m == VIDEO);
    }

    private void startVideo() {
        if (videoUri == null) return;
        bgVideo.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            @Override public void onSurfaceTextureAvailable(SurfaceTexture st, int w, int h) {
                if (mode == VIDEO && player == null) playOn(st);
            }
            @Override public void onSurfaceTextureSizeChanged(SurfaceTexture st, int w, int h) { }
            @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture st) { return true; }
            @Override public void onSurfaceTextureUpdated(SurfaceTexture st) { }
        });
        if (bgVideo.isAvailable()) playOn(bgVideo.getSurfaceTexture());
    }

    private void playOn(SurfaceTexture st) {
        stopVideo();
        try {
            player = new MediaPlayer();
            player.setDataSource(this, videoUri);
            player.setSurface(new Surface(st));
            player.setLooping(true);
            player.setVolume(0f, 0f);
            player.setOnVideoSizeChangedListener((mp, w, h) -> cropVideo(w, h));
            player.setOnPreparedListener(MediaPlayer::start);
            player.prepareAsync();
        } catch (Exception e) {
            Toast.makeText(this, "Non riesco a riprodurre il video", Toast.LENGTH_LONG).show();
            player = null;
        }
    }

    /** Il video riempie lo schermo ritagliato (come centerCrop), senza deformarsi. */
    private void cropVideo(int vw, int vh) {
        int w = bgVideo.getWidth(), h = bgVideo.getHeight();
        if (vw == 0 || vh == 0 || w == 0 || h == 0) return;
        float s = Math.max((float) w / vw, (float) h / vh);
        Matrix m = new Matrix();
        m.setScale(vw * s / w, vh * s / h, w / 2f, h / 2f);
        bgVideo.setTransform(m);
    }

    private void stopVideo() {
        if (player != null) {
            try { player.release(); } catch (Exception ignored) { }
            player = null;
        }
    }

    // ---- fotocamera ----

    private void startCamera() {
        final com.google.common.util.concurrent.ListenableFuture<ProcessCameraProvider> f =
                ProcessCameraProvider.getInstance(this);
        f.addListener(() -> {
            try {
                provider = f.get();
                bindCamera();
            } catch (Exception e) {
                Toast.makeText(this, "Fotocamera non disponibile", Toast.LENGTH_LONG).show();
            }
        }, getMainExecutor());
    }

    private void bindCamera() {
        if (provider == null) return;
        ImageAnalysis analysis = new ImageAnalysis.Builder()
                .setTargetResolution(new Size(720, 960))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build();
        analysis.setAnalyzer(worker, this::analyze);
        provider.unbindAll();
        try {
            provider.bindToLifecycle(this, new CameraSelector.Builder().requireLensFacing(lens).build(), analysis);
        } catch (Exception e) {
            Toast.makeText(this, "Questa fotocamera non c'è", Toast.LENGTH_SHORT).show();
        }
    }

    private void analyze(ImageProxy proxy) {
        try {
            Bitmap raw = proxy.toBitmap();
            Matrix m = new Matrix();
            m.postRotate(proxy.getImageInfo().getRotationDegrees());
            if (lens == CameraSelector.LENS_FACING_FRONT) m.postScale(-1f, 1f); // effetto specchio
            Bitmap frame = Bitmap.createBitmap(raw, 0, 0, raw.getWidth(), raw.getHeight(), m, true);
            int w = frame.getWidth(), h = frame.getHeight();

            SegmentationMask mask = Tasks.await(segmenter.process(InputImage.fromBitmap(frame, 0)));
            FloatBuffer conf = mask.getBuffer().asFloatBuffer();
            int[] px = new int[w * h];
            frame.getPixels(px, 0, w, 0, 0, w, h);
            for (int i = 0; i < px.length && conf.hasRemaining(); i++) {
                float c = conf.get();
                int a = c <= 0.3f ? 0 : c >= 0.7f ? 255 : (int) ((c - 0.3f) / 0.4f * 255f);
                px[i] = (px[i] & 0x00FFFFFF) | (a << 24);
            }
            final Bitmap cut = Bitmap.createBitmap(px, w, h, Bitmap.Config.ARGB_8888);
            final Bitmap blur = mode == BLUR
                    ? Bitmap.createScaledBitmap(frame, Math.max(1, w / 16), Math.max(1, h / 16), true) : null;

            lastPerson = cut;
            if (blur != null) lastBlur = blur;
            runOnUiThread(() -> {
                person.setImageBitmap(cut);
                if (mode == BLUR && blur != null) bgImage.setImageBitmap(blur);
            });
        } catch (Exception ignored) {
            // un fotogramma perso non è un problema: arriva il successivo
        } finally {
            proxy.close();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopVideo();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mode == VIDEO && bgVideo.isAvailable()) playOn(bgVideo.getSurfaceTexture());
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopVideo();
        segmenter.close();
        worker.shutdown();
    }
}
