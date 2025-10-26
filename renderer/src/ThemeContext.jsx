import React, { createContext, useState, useContext, useMemo } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Load saved theme or default to light
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("theme-mode");
    return saved || "light";
  });

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      localStorage.setItem("theme-mode", newMode);
      return newMode;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "light"
            ? {
                // Light mode colors
                primary: {
                  main: "#7f1d1d",
                  light: "#991b1b",
                  dark: "#5c0f0f",
                },
                secondary: {
                  main: "#1f2937",
                  light: "#374151",
                  dark: "#111827",
                },
                background: {
                  default: "#f9fafb",
                  paper: "#ffffff",
                },
                text: {
                  primary: "#1f2937",
                  secondary: "#6b7280",
                },
                divider: "#e5e7eb",
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
              }
            : {
                // Dark mode colors
                primary: {
                  main: "#f87171",
                  light: "#fca5a5",
                  dark: "#dc2626",
                },
                secondary: {
                  main: "#fbbf24",
                  light: "#fcd34d",
                  dark: "#f59e0b",
                },
                background: {
                  default: "#0f172a",
                  paper: "#1e293b",
                },
                text: {
                  primary: "#f1f5f9",
                  secondary: "#cbd5e1",
                },
                divider: "#334155",
                success: {
                  main: "#10b981",
                  light: "#34d399",
                  dark: "#059669",
                },
                error: {
                  main: "#ef4444",
                  light: "#f87171",
                  dark: "#dc2626",
                },
                warning: {
                  main: "#f59e0b",
                  light: "#fbbf24",
                  dark: "#d97706",
                },
                info: {
                  main: "#3b82f6",
                  light: "#60a5fa",
                  dark: "#2563eb",
                },
              }),
        },
        shape: { borderRadius: 6 },
        typography: {
          fontFamily: '"Inter", "SF Pro Display", "Segoe UI", "Roboto", sans-serif',
          h4: {
            fontWeight: 600,
            letterSpacing: "-0.02em",
          },
          h5: {
            fontWeight: 600,
            letterSpacing: "-0.01em",
          },
          h6: {
            fontWeight: 600,
            letterSpacing: "-0.01em",
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
                boxShadow: mode === "dark" ? "0 1px 2px rgba(0, 0, 0, 0.3)" : "0 1px 2px rgba(0, 0, 0, 0.1)",
                "&:hover": {
                  boxShadow: mode === "dark" ? "0 2px 4px rgba(0, 0, 0, 0.4)" : "0 2px 4px rgba(0, 0, 0, 0.15)",
                },
              },
              outlined: {
                borderWidth: "1.5px",
                "&:hover": {
                  borderWidth: "1.5px",
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
                borderRadius: 8,
                boxShadow: mode === "dark" ? "0 1px 3px rgba(0, 0, 0, 0.5)" : "0 1px 3px rgba(0, 0, 0, 0.1)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
                borderRadius: 8,
                boxShadow: mode === "dark" ? "0 1px 3px rgba(0, 0, 0, 0.5)" : "0 1px 3px rgba(0, 0, 0, 0.1)",
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                background: mode === "dark" ? "#1e293b" : "#f9fafb",
                borderRight: mode === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: mode === "dark" ? "#1e293b" : "#ffffff",
                color: mode === "dark" ? "#f1f5f9" : "#1f2937",
                boxShadow: mode === "dark" ? "0 1px 3px rgba(0, 0, 0, 0.5)" : "0 1px 3px rgba(0, 0, 0, 0.1)",
                borderBottom: mode === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                marginBottom: 4,
                "&.Mui-selected": {
                  background: mode === "dark" ? "rgba(248, 113, 113, 0.15)" : "rgba(127, 29, 29, 0.08)",
                  borderLeft: mode === "dark" ? "3px solid #f87171" : "3px solid #7f1d1d",
                  "&:hover": {
                    background: mode === "dark" ? "rgba(248, 113, 113, 0.2)" : "rgba(127, 29, 29, 0.12)",
                  },
                },
                "&:hover": {
                  background: mode === "dark" ? "rgba(248, 113, 113, 0.08)" : "rgba(127, 29, 29, 0.04)",
                },
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = {
    mode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

