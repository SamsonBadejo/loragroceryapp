import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function requiredEnv(name) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required for Google authentication`);
  }

  return value;
}

function getPrivateKey() {
  return requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getPrivateKey()
    })
  });
}

export const firebaseAdminAuth = getAuth();