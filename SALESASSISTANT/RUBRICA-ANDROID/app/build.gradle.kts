plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "it.yesmobility.rubrica"
    compileSdk = 35

    defaultConfig {
        applicationId = "it.yesmobility.rubrica"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "1.2"
    }

    // Chiave fissa (solo per l'uso personale): così ogni nuova versione dell'APK
    // si installa sopra la precedente senza dover disinstallare l'app.
    signingConfigs {
        create("personale") {
            storeFile = file("rubrica-debug.keystore")
            storePassword = "rubrica123"
            keyAlias = "rubrica"
            keyPassword = "rubrica123"
        }
    }
    buildTypes {
        getByName("debug") { signingConfig = signingConfigs.getByName("personale") }
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("personale")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
