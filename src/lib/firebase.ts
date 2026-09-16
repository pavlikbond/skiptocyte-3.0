import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
}

export const formSubmitUrl = import.meta.env.VITE_FORMSUBMIT_URL as string;

type Gtag = (...args: unknown[]) => void;

function gtagFn(): Gtag | undefined {
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  return typeof gtag === "function" ? gtag : undefined;
}

const measurementId = firebaseConfig.measurementId;

const analyticsReady: Promise<Analytics | null> = (async () => {
  if (typeof window === "undefined") return null;
  if (!measurementId) return null;
  if (import.meta.env.VITE_USE_EMULATORS === "true") return null;
  const { getAnalytics, initializeAnalytics, isSupported } = await import(
    "firebase/analytics"
  );
  if (!(await isSupported())) return null;
  let analytics: Analytics;
  try {
    analytics = initializeAnalytics(firebaseApp, {
      config: { send_page_view: false },
    });
  } catch {
    analytics = getAnalytics(firebaseApp);
  }
  // Dev Firebase project webConfig has no measurementId; bind the local GA4 ID from 2.0.
  gtagFn()?.("config", measurementId, { send_page_view: false, update: true });
  return analytics;
})();

let lastPageView = "";
let lastPageViewAt = 0;

export async function logPageView(path: string) {
  const now = Date.now();
  if (path === lastPageView && now - lastPageViewAt < 800) return;
  lastPageView = path;
  lastPageViewAt = now;

  await analyticsReady;
  const gtag = gtagFn();
  if (!gtag || !measurementId) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: document.title,
    page_location: window.location.href,
    send_to: measurementId,
  });
}
