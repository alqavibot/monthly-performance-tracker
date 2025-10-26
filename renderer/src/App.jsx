import React from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
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

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7f1d1d", // Dark maroon
      light: "#991b1b",
      dark: "#5c0f0f",
    },
    secondary: {
      main: "#1f2937", // Dark gray/black
      light: "#374151",
      dark: "#111827",
    },
    success: {
      main: "#15803d",
      light: "#16a34a",
      dark: "#14532d",
    },
    error: {
      main: "#991b1b",
      light: "#dc2626",
      dark: "#7f1d1d",
    },
    warning: {
      main: "#92400e",
      light: "#b45309",
      dark: "#78350f",
    },
    info: {
      main: "#1e40af",
      light: "#2563eb",
      dark: "#1e3a8a",
    },
    background: {
      default: "#ffffff",
      paper: "#fafafa",
    },
    text: {
      primary: "#1f2937",
      secondary: "#6b7280",
    },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Segoe UI", "Roboto", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: "-0.02em",
      color: "#1f2937",
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "#1f2937",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "#1f2937",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          borderRadius: 6,
          padding: "10px 20px",
        },
        contained: {
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          "&:hover": {
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
          },
        },
        outlined: {
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
            backgroundColor: "rgba(127, 29, 29, 0.04)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "#f9fafb",
          borderRight: "1px solid #e5e7eb",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "#ffffff",
          color: "#1f2937",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #e5e7eb",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          marginBottom: 4,
          "&.Mui-selected": {
            background: "rgba(127, 29, 29, 0.08)",
            borderLeft: "3px solid #7f1d1d",
            "&:hover": {
              background: "rgba(127, 29, 29, 0.12)",
            },
          },
          "&:hover": {
            background: "rgba(127, 29, 29, 0.04)",
          },
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}
