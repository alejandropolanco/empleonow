import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Empaquetado nativo (Android/iOS) del mismo frontend que se publica como PWA.
 * Flujo:
 *   npm run build
 *   npx cap add android   # o ios, solo la primera vez
 *   npm run cap:sync
 *   npx cap open android
 *
 * El access token vive en memoria y la API usa HTTPS; no hay mixed content.
 */
const config: CapacitorConfig = {
  appId: 'com.empleonow.app',
  appName: 'EmpleoNow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
