import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Snackbar,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../App";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

// Helper: safe local file name for Electron
function localFileName(key) {
  return `account_${key.replace(/[\\/: ]/g, "_")}.json`;
}

// Detect if Electron preload API is available
const hasElectron = window?.electronAPI?.writeLocalFile;

export default function AccountPage({ accountKey, columns }) {
  const [rows, setRows] = useState([]);
  const [openSnack, setOpenSnack] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reasonDialog, setReasonDialog] = useState({ open: false, rowId: null, instrument: "", type: "" });
  const [tempReason, setTempReason] = useState("");
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);

  // Create one blank row template with auto-filled date
  function emptyRow() {
    const r = {};
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Auto-fill DATE/DAY column
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const dateString = `${date} ${month} - ${dayName}`;
    
    columns.forEach((c) => {
      if (c === "DATE/DAY") {
        r[c] = dateString;
      } else {
        r[c] = "";
      }
    });
    r._id = uuidv4();
    return r;
  }
  
  // Get current month and year for display
  function getCurrentMonthYear() {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Check if today is weekend
  function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  }

  // Analyze previous trades performance
  function analyzePerformance() {
    if (rows.length === 0) {
      return { tpCount: 0, slCount: 0, total: 0 };
    }

    let tpCount = 0;
    let slCount = 0;

    rows.forEach(row => {
      const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
      if (tpOrSl.includes("tp") || tpOrSl.includes("take profit")) {
        tpCount++;
      } else if (tpOrSl.includes("sl") || tpOrSl.includes("stop loss")) {
        slCount++;
      }
    });

    return { tpCount, slCount, total: tpCount + slCount };
  }

  // Load data on mount or account switch
  useEffect(() => {
    setLoaded(false); // Reset loaded state
    async function load() {
      const key = accountKey;
      console.log("Loading account:", key);
      
      // 1️⃣ Try local storage first (Electron or Browser)
      if (hasElectron) {
        const raw = window.electronAPI.readLocalFile(localFileName(key));
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log("Loaded from local cache:", parsed);
          setRows(parsed);
          setLoaded(true);
          return;
        }
      } else {
        // Try browser localStorage
        const stored = localStorage.getItem(`account_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("Loaded from browser storage:", parsed);
          setRows(parsed);
          setLoaded(true);
          return;
        }
      }

      // 2️⃣ Try Firebase (only if no local data)
      try {
        const ref = doc(db, "accounts", encodeURIComponent(key));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const loadedRows = data.rows && data.rows.length > 0 ? data.rows : [emptyRow()];
          console.log("Loaded from Firebase:", loadedRows);
          setRows(loadedRows);
        } else {
          console.log("No existing data, creating empty row");
          setRows([emptyRow()]);
        }
      } catch (err) {
        console.warn("Firebase load failed (using local-only mode):", err.message);
        setRows([emptyRow()]);
      }
      setLoaded(true);
    }
    load();
  }, [accountKey]);

  // Auto-save to LOCAL STORAGE ONLY (not Firebase)
  useEffect(() => {
    if (!loaded || rows.length === 0) return;
    
    const timer = setTimeout(() => {
    const key = accountKey;
      
      // Save locally ONLY (if Electron)
    if (hasElectron) {
        try {
      window.electronAPI.writeLocalFile(
        localFileName(key),
        JSON.stringify(rows, null, 2)
      );
          console.log("✓ Auto-saved to local storage");
        } catch (err) {
          console.warn("Local save failed:", err);
        }
      } else {
        // For web version, save to localStorage
        try {
          localStorage.setItem(`account_${key}`, JSON.stringify(rows));
          console.log("✓ Auto-saved to browser storage");
        } catch (err) {
          console.warn("Browser storage failed:", err);
        }
      }
    }, 500); // Fast local save

    return () => clearTimeout(timer);
  }, [rows, loaded, accountKey]);

  // Check if instrument matches account name (supports multiple instruments)
  const checkInstrumentMatch = (instrument) => {
    // Get full account name (everything after the section name)
    // e.g., "Funded Accounts/BTCUSD/US30" -> "BTCUSD/US30"
    const parts = accountKey.split("/");
    const accountName = parts.slice(1).join("/").toUpperCase(); // Join back with "/" in case account has "/"
    const instrumentUpper = instrument.toUpperCase().trim();
    
    if (!instrumentUpper) return false;
    
    console.log("Full account name:", accountName);
    console.log("Checking instrument:", instrumentUpper);
    
    // Split account name by "/" to get multiple instruments
    const accountInstruments = accountName.split("/").map(i => i.trim());
    console.log("Account instruments:", accountInstruments);
    
    // Check each instrument in the account name
    for (const accountInst of accountInstruments) {
      // Exact match
      if (instrumentUpper === accountInst) {
        console.log("✓ Exact match found:", instrumentUpper, "===", accountInst);
        return true;
      }
      
      // Contains match (either direction)
      if (instrumentUpper.includes(accountInst) || accountInst.includes(instrumentUpper)) {
        console.log("✓ Contains match found:", instrumentUpper, "<->", accountInst);
        return true;
      }
      
      // Special case: BTC matches BTCUSD
      if (accountInst.includes("BTCUSD") && instrumentUpper.includes("BTC")) {
        console.log("✓ BTC/BTCUSD match found");
        return true;
      }
    }
    
    console.log("✗ No match found");
    return false;
  };

  const updateCell = (id, col, val) => {
    console.log(`Updating cell - ID: ${id}, Column: ${col}, Value: ${val}`);
    
    setRows((prev) => {
      const updated = prev.map((r) => (r._id === id ? { ...r, [col]: val } : r));
      console.log("Updated rows:", updated);
      return updated;
    });
  };
  
  // Validate instrument when user finishes typing (on blur)
  const validateInstrument = (id, instrument) => {
    if (instrument.trim() !== "" && !checkInstrumentMatch(instrument)) {
      // Check if this instrument already has a reason
      const row = rows.find(r => r._id === id);
      if (!row?._instrumentReason) {
        // Ask for reason
        setReasonDialog({ open: true, rowId: id, instrument, type: "instrument" });
      }
    }
  };
  
  // Validate over-risk when user finishes typing (on blur)
  const validateOverRisk = (id, value) => {
    const valueUpper = value.toUpperCase().trim();
    if (valueUpper === "YES" || valueUpper === "Y") {
      // Check if already has a reason
      const row = rows.find(r => r._id === id);
      if (!row?._overRiskReason) {
        // Ask for reason
        setReasonDialog({ open: true, rowId: id, instrument: "", type: "overrisk" });
      }
    }
  };
  
  // Validate early exit when user finishes typing (on blur)
  const validateEarlyExit = (id, value) => {
    const valueUpper = value.toUpperCase().trim();
    if (valueUpper === "YES" || valueUpper === "Y") {
      // Check if already has a reason
      const row = rows.find(r => r._id === id);
      if (!row?._earlyExitReason) {
        // Ask for reason
        setReasonDialog({ open: true, rowId: id, instrument: "", type: "earlyexit" });
      }
    }
  };
  
  const handleReasonSubmit = () => {
    const { rowId, instrument, type } = reasonDialog;
    
    if (type === "instrument") {
      setRows((prev) => 
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "INTRUMENT": instrument, "_instrumentReason": tempReason } 
            : r
        )
      );
    } else if (type === "overrisk") {
      setRows((prev) => 
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "_overRiskReason": tempReason } 
            : r
        )
      );
    } else if (type === "earlyexit") {
      setRows((prev) => 
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "_earlyExitReason": tempReason } 
            : r
        )
      );
    }
    
    setReasonDialog({ open: false, rowId: null, instrument: "", type: "" });
    setTempReason("");
  };
  
  const handleReasonCancel = () => {
    const { type, rowId } = reasonDialog;
    
    // Clear the "YES" value if cancelled
    if (type === "overrisk") {
      setRows((prev) => 
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "OVER RISKED ?": "" } 
            : r
        )
      );
    } else if (type === "earlyexit") {
    setRows((prev) =>
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "EARLY EXIT ?": "" } 
            : r
        )
      );
    }
    
    setReasonDialog({ open: false, rowId: null, instrument: "", type: "" });
    setTempReason("");
  };

  const addRow = () => {
    const newRow = emptyRow();
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    
    // Immediately sync new row to cloud
    const key = accountKey;
    console.log("Adding new row, syncing to cloud...");
    
    setDoc(doc(db, "accounts", encodeURIComponent(key)), { rows: updatedRows }, { merge: true })
      .then(() => {
        console.log("✓ New row synced to cloud");
      })
      .catch((err) => {
        console.warn("Failed to sync new row to cloud:", err.message);
      });
  };
  
  const deleteRow = (id) => {
    const updatedRows = rows.filter((r) => r._id !== id);
    setRows(updatedRows);
    
    // Immediately sync deletion to cloud
    const key = accountKey;
    console.log("Deleting row, syncing to cloud...");
    
    setDoc(doc(db, "accounts", encodeURIComponent(key)), { rows: updatedRows }, { merge: true })
      .then(() => {
        console.log("✓ Deletion synced to cloud");
      })
      .catch((err) => {
        console.warn("Failed to sync deletion to cloud:", err.message);
      });
  };

  return (
    <Box
      sx={{
        width: "100%",
        p: 0,
      }}
    >
      {/* Modern Header Card */}
      <Box
        sx={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
          borderRadius: 3,
          p: 2,
          mb: 2,
          border: "1px solid rgba(99, 102, 241, 0.2)",
          backdropFilter: "blur(20px)",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {accountKey.split("/")[1]}
              </Typography>
              {saving && (
                <Chip
                  label="Saving to Cloud..."
                  size="small"
                  color="warning"
                  sx={{
                    fontWeight: 600,
                    animation: "pulse 1s infinite",
                  }}
                />
              )}
              {loaded && !saving && (
                <Chip
                  label="Auto-saved locally"
                  size="small"
                  sx={{
                    bgcolor: "success.main",
                    color: "white",
                    fontWeight: 600,
                  }}
                />
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {accountKey.split("/")[0]} • {rows.length} {rows.length === 1 ? "trade" : "trades"}
      </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="success"
              onClick={addRow}
              sx={{
                px: 3,
                py: 1.5,
                fontSize: 15,
                boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.39)",
              }}
            >
          + Add New Trade
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
                // Save to Firebase Cloud
                const key = accountKey;
                setSaving(true);
                console.log("Manual cloud save - Rows:", rows);
                
                setDoc(doc(db, "accounts", encodeURIComponent(key)), { rows }, { merge: true })
                  .then(() => {
                    // Also save locally
            if (hasElectron) {
              window.electronAPI.writeLocalFile(
                        localFileName(key),
                        JSON.stringify(rows, null, 2)
                      );
                    } else {
                      localStorage.setItem(`account_${key}`, JSON.stringify(rows));
                    }
                    setSaving(false);
                    console.log("✓ Cloud save successful");
                    setOpenSnack(true);
                  })
                  .catch((err) => {
                    console.error("Cloud save failed:", err.message);
                    setSaving(false);
                    
                    // Show friendly error message
                    if (err.code === 'permission-denied') {
                      alert("⚠️ Cloud sync is disabled.\n\nYour data is safely saved locally on your computer.\n\nTo enable cloud sync:\n1. Go to Firebase Console\n2. Update Firestore Rules\n3. See console for instructions");
                      console.log("%c📝 TO ENABLE CLOUD SYNC:", "color: #6366f1; font-size: 16px; font-weight: bold");
                      console.log("1. Go to: https://console.firebase.google.com/");
                      console.log("2. Select your project: monthly-performance-tracker");
                      console.log("3. Click 'Firestore Database' → 'Rules'");
                      console.log("4. Replace rules with:\n\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}");
                      console.log("5. Click 'Publish'");
            } else {
                      alert("Failed to save to cloud. Data is saved locally.\n\nError: " + err.message);
                    }
                  });
              }}
              sx={{
                px: 3,
                py: 1.5,
                fontSize: 15,
              }}
              disabled={saving}
            >
              {saving ? "⏳ Saving..." : "☁️ Save to Cloud"}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                const payload = JSON.stringify(rows, null, 2);
              const blob = new Blob([payload], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${accountKey.replace(/[\\/\\s:]/g, "_")}.json`;
              a.click();
              }}
              sx={{
                px: 3,
                py: 1.5,
                fontSize: 15,
              }}
            >
              📤 Export JSON
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Month Display */}
      <Box
        sx={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderBottom: isWeekend() ? "1px solid rgba(99, 102, 241, 0.2)" : "none",
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "primary.light",
            letterSpacing: 1,
          }}
        >
          📅 {getCurrentMonthYear()}
        </Typography>
      </Box>

      {/* Compact Weekend Banner */}
      {isWeekend() && (() => {
        const { tpCount, slCount, total } = analyzePerformance();
        const winRate = total > 0 ? ((tpCount / total) * 100).toFixed(1) : 0;
        const isGoodPerformance = tpCount > slCount;

        return (
          <Box
            sx={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderTop: "none",
              p: 2,
              mb: 2,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "error.light",
                  }}
                >
                  🚫 Market Closed - {new Date().getDay() === 0 ? "Sunday" : "Saturday"}
                </Typography>
                {total > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 3,
                      px: 3,
                      py: 1,
                      background: isGoodPerformance 
                        ? "rgba(16, 185, 129, 0.15)" 
                        : "rgba(99, 102, 241, 0.15)",
                      borderRadius: 2,
                      border: isGoodPerformance 
                        ? "1px solid rgba(16, 185, 129, 0.3)"
                        : "1px solid rgba(99, 102, 241, 0.3)",
                    }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
                        {tpCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
                        TP
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
                        {slCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
                        SL
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {winRate}%
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
                        Win
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
              
              {total > 0 && (
                <Button
                  variant="contained"
                  onClick={() => setPerformanceDialogOpen(true)}
                  sx={{
                    background: isGoodPerformance 
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                    color: "white",
                    fontWeight: 600,
                    px: 3,
                  }}
                >
                  {isGoodPerformance ? "🎉 View Analysis" : "💡 View Feedback"}
                </Button>
              )}
            </Stack>
          </Box>
        );
      })()}

      {/* Full Performance Analysis Modal */}
      {isWeekend() && (() => {
        const { tpCount, slCount, total } = analyzePerformance();
        const winRate = total > 0 ? ((tpCount / total) * 100).toFixed(1) : 0;
        const isGoodPerformance = tpCount > slCount;

        return (
          <Dialog
            open={performanceDialogOpen}
            onClose={() => setPerformanceDialogOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: "background.paper",
                borderRadius: 3,
              }
            }}
          >
            <DialogTitle sx={{ 
              fontWeight: 700, 
              fontSize: 28,
              background: isGoodPerformance 
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)"
                : "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
              borderBottom: isGoodPerformance 
                ? "2px solid rgba(16, 185, 129, 0.3)"
                : "2px solid rgba(99, 102, 241, 0.3)",
            }}>
              📊 Last Week's Performance Analysis
            </DialogTitle>
            <DialogContent sx={{ mt: 3 }}>
              {total > 0 ? (
                <Box>
                  <Stack direction="row" spacing={6} justifyContent="center" sx={{ mb: 4 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: "success.main" }}>
                        {tpCount}
                      </Typography>
                      <Typography variant="h6" sx={{ color: "text.secondary", mt: 1 }}>
                        Take Profits
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: "error.main" }}>
                        {slCount}
                      </Typography>
                      <Typography variant="h6" sx={{ color: "text.secondary", mt: 1 }}>
                        Stop Losses
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {winRate}%
                      </Typography>
                      <Typography variant="h6" sx={{ color: "text.secondary", mt: 1 }}>
                        Win Rate
                      </Typography>
                    </Box>
                  </Stack>

                  {isGoodPerformance ? (
                    <Box sx={{ 
                      textAlign: "center",
                      p: 4,
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)",
                      borderRadius: 2,
                      border: "2px solid rgba(16, 185, 129, 0.3)",
                    }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          color: "success.light",
                          mb: 2,
                        }}
                      >
                        🎉 Excellent Work!
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          color: "text.primary",
                          lineHeight: 1.8,
                        }}
                      >
                        You had more Take Profits than Stop Losses! Keep up the great discipline and strategy execution. 
                        Review your winning trades and replicate those patterns next week.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      p: 4,
                      background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
                      borderRadius: 2,
                      border: "2px solid rgba(99, 102, 241, 0.3)",
                    }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          color: "warning.light",
                          mb: 3,
                          textAlign: "center",
                        }}
                      >
                        💡 Areas to Improve Next Week
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          color: "text.primary",
                          mb: 3,
                          textAlign: "center",
                        }}
                      >
                        Focus on these key areas:
                      </Typography>
                      <Stack spacing={2} sx={{ maxWidth: 600, mx: "auto" }}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                          <Typography variant="h6" sx={{ color: "success.main" }}>✓</Typography>
                          <Typography variant="body1" sx={{ color: "text.primary", flex: 1 }}>
                            <strong>Review your risk management</strong> - Were you over-risked?
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                          <Typography variant="h6" sx={{ color: "success.main" }}>✓</Typography>
                          <Typography variant="body1" sx={{ color: "text.primary", flex: 1 }}>
                            <strong>Analyze early exits</strong> - Did you close trades prematurely?
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                          <Typography variant="h6" sx={{ color: "success.main" }}>✓</Typography>
                          <Typography variant="body1" sx={{ color: "text.primary", flex: 1 }}>
                            <strong>Check your entry timing</strong> and market conditions
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                          <Typography variant="h6" sx={{ color: "success.main" }}>✓</Typography>
                          <Typography variant="body1" sx={{ color: "text.primary", flex: 1 }}>
                            <strong>Stick to your trading plan</strong> and avoid emotional decisions
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.secondary",
                    fontStyle: "italic",
                    textAlign: "center",
                    py: 4,
                  }}
                >
                  No trades recorded yet. Start trading on Monday!
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, justifyContent: "center" }}>
              <Button
                onClick={() => setPerformanceDialogOpen(false)}
                variant="contained"
                size="large"
                sx={{
                  px: 5,
                  py: 1.5,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Modern Table Card */}
      <Box
        sx={{
          background: "rgba(30, 41, 59, 0.5)",
          borderRadius: 0,
          overflow: "auto",
          border: "1px solid rgba(99, 102, 241, 0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Table Container */}
      <Box
        sx={{
          display: "grid",
            gridTemplateColumns: "120px 140px 100px 140px 120px 120px 120px 1fr 80px",
            gap: 0,
            minWidth: "1200px",
        }}
      >
        {/* Header */}
        {columns.map((c) => (
          <Box
            key={c}
            sx={{
                p: 0.75,
                fontWeight: 700,
                fontSize: 11,
              textAlign: "center",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                borderBottom: "2px solid rgba(99, 102, 241, 0.3)",
                color: "primary.light",
                textTransform: "uppercase",
                letterSpacing: 0.3,
            }}
          >
            {c}
          </Box>
        ))}
        <Box
          sx={{
              p: 0.75,
              fontWeight: 700,
              fontSize: 11,
            textAlign: "center",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
              borderBottom: "2px solid rgba(99, 102, 241, 0.3)",
              color: "primary.light",
              textTransform: "uppercase",
              letterSpacing: 0.3,
          }}
        >
          Actions
        </Box>

        {/* Rows */}
          {rows.map((r, idx) => (
          <React.Fragment key={r._id}>
            {columns.map((c) => (
              <Box
                key={c}
                sx={{
                    p: 0.25,
                    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                    backgroundColor: idx % 2 === 0 
                      ? "rgba(15, 23, 42, 0.3)" 
                      : "rgba(30, 41, 59, 0.3)",
                    transition: "background-color 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(99, 102, 241, 0.05)",
                    },
                }}
              >
                {c === "FEEDBACK" ? (
                    <Tooltip 
                      title={r[c] || ""} 
                      arrow 
                      placement="top"
                      enterDelay={300}
                      sx={{
                        "& .MuiTooltip-tooltip": {
                          maxWidth: 400,
                          fontSize: 13,
                          bgcolor: "rgba(30, 41, 59, 0.95)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                        }
                      }}
                    >
                  <TextField
                    value={r[c] || ""}
                    onChange={(e) => updateCell(r._id, c, e.target.value)}
                    multiline
                        minRows={1}
                    variant="outlined"
                    fullWidth
                        placeholder="Enter feedback..."
                    sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: "rgba(15, 23, 42, 0.6)",
                            borderRadius: 0,
                            padding: "4px 8px",
                          },
                      "& .MuiInputBase-input": {
                        textAlign: "left",
                        verticalAlign: "top",
                            color: "#f1f5f9",
                            fontSize: 12,
                            padding: "2px 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            "&:focus": {
                              whiteSpace: "normal",
                            },
                          },
                          "& fieldset": { 
                            borderColor: "rgba(99, 102, 241, 0.2)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(99, 102, 241, 0.4)",
                          },
                          "& .Mui-focused fieldset": {
                            borderColor: "primary.main",
                          },
                        }}
                      />
                    </Tooltip>
                  ) : c === "EARLY EXIT ?" && r._earlyExitReason ? (
                    <Tooltip 
                      title={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            ⚠️ Early Exit
                          </Typography>
                          <Typography variant="body2">
                            Reason: {r._earlyExitReason}
                          </Typography>
                        </Box>
                      } 
                      arrow 
                      placement="top"
                      enterDelay={200}
                      sx={{
                        "& .MuiTooltip-tooltip": {
                          maxWidth: 300,
                          fontSize: 12,
                          bgcolor: "rgba(245, 158, 11, 0.95)",
                          border: "1px solid rgba(245, 158, 11, 0.5)",
                        }
                      }}
                    >
                      <TextField
                        value={r[c] || ""}
                        onChange={(e) => updateCell(r._id, c, e.target.value)}
                        onBlur={(e) => validateEarlyExit(r._id, e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="..."
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: "rgba(245, 158, 11, 0.2)",
                            borderRadius: 0,
                            height: "32px",
                            border: "1px solid rgba(245, 158, 11, 0.5)",
                          },
                          "& .MuiInputBase-input": {
                            textAlign: "center",
                            color: "#fbbf24",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "6px 8px",
                          },
                          "& fieldset": { 
                            borderColor: "rgba(245, 158, 11, 0.5)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(245, 158, 11, 0.7)",
                          },
                          "& .Mui-focused fieldset": {
                            borderColor: "warning.main",
                          },
                        }}
                      />
                    </Tooltip>
                  ) : c === "OVER RISKED ?" && r._overRiskReason ? (
                    <Tooltip 
                      title={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            ⚠️ Over-Risked
                          </Typography>
                          <Typography variant="body2">
                            Reason: {r._overRiskReason}
                          </Typography>
                        </Box>
                      } 
                      arrow 
                      placement="top"
                      enterDelay={200}
                      sx={{
                        "& .MuiTooltip-tooltip": {
                          maxWidth: 300,
                          fontSize: 12,
                          bgcolor: "rgba(239, 68, 68, 0.95)",
                          border: "1px solid rgba(239, 68, 68, 0.5)",
                        }
                      }}
                    >
                      <TextField
                        value={r[c] || ""}
                        onChange={(e) => updateCell(r._id, c, e.target.value)}
                        onBlur={(e) => validateOverRisk(r._id, e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="..."
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: "rgba(239, 68, 68, 0.2)",
                            borderRadius: 0,
                            height: "32px",
                            border: "1px solid rgba(239, 68, 68, 0.5)",
                          },
                          "& .MuiInputBase-input": {
                            textAlign: "center",
                            color: "#f87171",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "6px 8px",
                          },
                          "& fieldset": { 
                            borderColor: "rgba(239, 68, 68, 0.5)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(239, 68, 68, 0.7)",
                          },
                          "& .Mui-focused fieldset": {
                            borderColor: "error.main",
                          },
                        }}
                      />
                    </Tooltip>
                  ) : c === "INTRUMENT" && r._instrumentReason ? (
                    <Tooltip 
                      title={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            ⚠️ Different Instrument
                          </Typography>
                          <Typography variant="body2">
                            Reason: {r._instrumentReason}
                          </Typography>
                        </Box>
                      } 
                      arrow 
                      placement="top"
                      enterDelay={200}
                      sx={{
                        "& .MuiTooltip-tooltip": {
                          maxWidth: 300,
                          fontSize: 12,
                          bgcolor: "rgba(245, 158, 11, 0.95)",
                          border: "1px solid rgba(245, 158, 11, 0.5)",
                        }
                      }}
                    >
                      <TextField
                        value={r[c] || ""}
                        onChange={(e) => updateCell(r._id, c, e.target.value)}
                        onBlur={(e) => validateInstrument(r._id, e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="..."
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: "rgba(245, 158, 11, 0.2)",
                            borderRadius: 0,
                            height: "32px",
                            border: "1px solid rgba(245, 158, 11, 0.5)",
                          },
                          "& .MuiInputBase-input": {
                            textAlign: "center",
                            color: "#fbbf24",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "6px 8px",
                          },
                          "& fieldset": { 
                            borderColor: "rgba(245, 158, 11, 0.5)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(245, 158, 11, 0.7)",
                          },
                          "& .Mui-focused fieldset": {
                            borderColor: "warning.main",
                          },
                        }}
                      />
                    </Tooltip>
                ) : (
                  <TextField
                    value={r[c] || ""}
                    onChange={(e) => updateCell(r._id, c, e.target.value)}
                      onBlur={(e) => {
                        // Validate INSTRUMENT field when user finishes typing
                        if (c === "INTRUMENT") {
                          validateInstrument(r._id, e.target.value);
                        }
                        // Validate OVER RISKED field
                        if (c === "OVER RISKED ?") {
                          validateOverRisk(r._id, e.target.value);
                        }
                        // Validate EARLY EXIT field
                        if (c === "EARLY EXIT ?") {
                          validateEarlyExit(r._id, e.target.value);
                        }
                      }}
                    variant="outlined"
                    fullWidth
                      placeholder="..."
                      size="small"
                    sx={{
                        "& .MuiInputBase-root": {
                          backgroundColor: "rgba(15, 23, 42, 0.6)",
                          borderRadius: 0,
                          height: "32px",
                        },
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                          color: "#f1f5f9",
                          fontWeight: 500,
                          fontSize: 12,
                          padding: "6px 8px",
                        },
                        "& fieldset": { 
                          borderColor: "rgba(99, 102, 241, 0.2)",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(99, 102, 241, 0.4)",
                        },
                        "& .Mui-focused fieldset": {
                          borderColor: "primary.main",
                        },
                    }}
                  />
                )}
              </Box>
            ))}
            <Box
              sx={{
                  p: 0.25,
                  borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                  backgroundColor: idx % 2 === 0 
                    ? "rgba(15, 23, 42, 0.3)" 
                    : "rgba(30, 41, 59, 0.3)",
                  transition: "background-color 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(99, 102, 241, 0.05)",
                  },
                }}
              >
                <Tooltip title="Delete Trade" arrow>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => deleteRow(r._id)}
                    sx={{
                      padding: "4px",
                      "&:hover": {
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </React.Fragment>
        ))}
        </Box>
      </Box>

      <Snackbar
        open={openSnack}
        onClose={() => setOpenSnack(false)}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{
          "& .MuiSnackbarContent-root": {
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(16, 185, 129, 0.4)",
            fontSize: 15,
            fontWeight: 600,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          ✓ Saved to cloud successfully!
        </Box>
      </Snackbar>

      {/* Reason Dialog for Different Instrument or Over-Risk */}
      <Dialog
        open={reasonDialog.open}
        onClose={handleReasonCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700, 
          color: reasonDialog.type === "overrisk" ? "error.main" : "warning.main" 
        }}>
          {reasonDialog.type === "overrisk" 
            ? "⚠️ Over-Risked Detected" 
            : reasonDialog.type === "earlyexit"
            ? "⚠️ Early Exit Detected"
            : "⚠️ Different Instrument Detected"}
        </DialogTitle>
        <DialogContent>
          {reasonDialog.type === "overrisk" ? (
            <>
              <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                You marked this trade as <strong style={{ color: "#ef4444" }}>OVER RISKED</strong>.
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                Please explain why you over-risked on this trade:
              </Typography>
            </>
          ) : reasonDialog.type === "earlyexit" ? (
            <>
              <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                You marked this trade as <strong style={{ color: "#fbbf24" }}>EARLY EXIT</strong>.
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                Please explain why you exited early. Was it due to liquidity sweep or another reason?
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                You're trading <strong style={{ color: "#fbbf24" }}>{reasonDialog.instrument}</strong> in the{" "}
                <strong style={{ color: "#6366f1" }}>{accountKey.split("/").slice(1).join("/")}</strong> account.
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                Please provide a reason why you're trading a different instrument in this account:
              </Typography>
            </>
          )}
          <TextField
            autoFocus
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            placeholder={
              reasonDialog.type === "overrisk"
                ? "e.g., Emotional decision, Market opportunity, Revenge trading..."
                : reasonDialog.type === "earlyexit"
                ? "e.g., Liquidity sweep, Fear of loss, Market reversal signal..."
                : "e.g., Testing new strategy, Better opportunity, Risk diversification..."
            }
            value={tempReason}
            onChange={(e) => setTempReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleReasonCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleReasonSubmit}
            variant="contained"
            color={reasonDialog.type === "overrisk" ? "error" : "warning"}
            disabled={!tempReason.trim()}
          >
            Save Reason
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
