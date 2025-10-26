import React from "react";
import Dashboard from "./components/Dashboard";

import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

// ✅ Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline caching
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Persistence error:", err);
});

export default function App() {
  return <Dashboard />;
}
