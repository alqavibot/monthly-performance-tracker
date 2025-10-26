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
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { db } from "../App";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import PerformanceCharts from "./PerformanceCharts";
import WinRateGraphs from "./WinRateGraphs";
import InstrumentAnalysis from "./InstrumentAnalysis";
import AchievementsPage from "./AchievementsPage";
import TradingInsights from "./TradingInsights";
import HistoricalComparison from "./HistoricalComparison";
import CustomDashboard from "./CustomDashboard";
import { useThemeMode } from "../ThemeContext";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import DashboardIcon from "@mui/icons-material/Dashboard";

// Helper: safe local file name for Electron
function localFileName(key) {
  return `account_${key.replace(/[\\/: ]/g, "_")}.json`;
}

// Detect if Electron preload API is available
const hasElectron = window?.electronAPI?.writeLocalFile;

export default function AccountPage({ accountKey, columns }) {
  const { mode, toggleTheme } = useThemeMode();
  const [rows, setRows] = useState([]);
  const [openSnack, setOpenSnack] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reasonDialog, setReasonDialog] = useState({ open: false, rowId: null, instrument: "", type: "" });
  const [tempReason, setTempReason] = useState("");
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [expectedRisk, setExpectedRisk] = useState(""); // New state for expected risk amount
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackView, setFeedbackView] = useState("weekly"); // "weekly" or "monthly"
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState(0); // 0 = Performance, 1 = Win Rate, 2 = Instruments, 3 = Insights, 4 = Historical
  const [achievementsDialogOpen, setAchievementsDialogOpen] = useState(false);
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false);
  
  // 📅 Monthly Rotation State
  const [currentMonthKey, setCurrentMonthKey] = useState(""); // e.g., "2025-10"
  const [previousMonthData, setPreviousMonthData] = useState(null); // Previous month's raw trades
  const [monthlySummaries, setMonthlySummaries] = useState({}); // Archived summaries { "2025-09": {...}, "2025-08": {...} }
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
  // 📝 Rename Account State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  
  // 📱 Mobile Features State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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
      const plValue = parseFloat(row["P/L"]);
      if (!isNaN(plValue)) {
        if (plValue > 0) {
          tpCount++;
        } else if (plValue < 0) {
          slCount++;
        }
      }
    });

    return { tpCount, slCount, total: tpCount + slCount };
  }

  // 📅 MONTHLY ROTATION HELPER FUNCTIONS
  
  // Get current month key (e.g., "2025-10")
  function getMonthKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // Generate comprehensive monthly summary from trade data
  function generateMonthlySummary(trades, monthKey, riskAmount) {
    if (!trades || trades.length === 0) {
      return {
        monthKey,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalProfit: 0,
        avgRR: 0,
        bestTrade: 0,
        worstTrade: 0,
        expectedRisk: riskAmount,
        createdAt: new Date().toISOString()
      };
    }

    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let totalRR = 0;
    let rrCount = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;

    trades.forEach(row => {
      const plValue = parseFloat(row["P/L"]);
      if (!isNaN(plValue)) {
        totalProfit += plValue;
        if (plValue > 0) {
          wins++;
          bestTrade = Math.max(bestTrade, plValue);
        } else if (plValue < 0) {
          losses++;
          worstTrade = Math.min(worstTrade, plValue);
        }
      }

      const rrValue = parseFloat(row["RR"]);
      if (!isNaN(rrValue)) {
        totalRR += rrValue;
        rrCount++;
      }
    });

    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    const avgRR = rrCount > 0 ? (totalRR / rrCount).toFixed(2) : 0;

    return {
      monthKey,
      totalTrades: trades.length,
      wins,
      losses,
      winRate: parseFloat(winRate),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      avgRR: parseFloat(avgRR),
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      expectedRisk: riskAmount,
      createdAt: new Date().toISOString()
    };
  }

  // Perform monthly rotation
  function performMonthRotation(accountData) {
    console.log("🔄 Performing monthly rotation...");
    
    const newMonthKey = getMonthKey();
    
    // Step 1: If there's a "previous month", archive it
    if (accountData.previousMonthData && accountData.previousMonthData.trades.length > 0) {
      const summary = generateMonthlySummary(
        accountData.previousMonthData.trades,
        accountData.previousMonthData.monthKey,
        accountData.previousMonthData.expectedRisk
      );
      
      console.log(`📦 Archiving ${accountData.previousMonthData.monthKey}:`, summary);
      
      // Add to summaries
      accountData.monthlySummaries[accountData.previousMonthData.monthKey] = summary;
    }
    
    // Step 2: Move current → previous
    if (accountData.currentMonthKey && accountData.rows.length > 0) {
      accountData.previousMonthData = {
        monthKey: accountData.currentMonthKey,
        trades: [...accountData.rows],
        expectedRisk: accountData.expectedRisk
      };
      console.log(`📋 Moved current month (${accountData.currentMonthKey}) to previous`);
    } else {
      accountData.previousMonthData = null;
    }
    
    // Step 3: Start fresh current month
    accountData.currentMonthKey = newMonthKey;
    accountData.rows = [emptyRow()];
    
    console.log(`✨ Started new month: ${newMonthKey}`);
    console.log(`📊 Total archived months: ${Object.keys(accountData.monthlySummaries).length}`);
    
    return accountData;
  }

  // Parse date from "DATE/DAY" field (format: "26 Oct - Sunday")
  // Returns date normalized to midnight for accurate comparison
  function parseTradeDate(dateString) {
    if (!dateString) return null;
    try {
      const parts = dateString.split(" - ")[0].trim(); // "26 Oct"
      const [day, month] = parts.split(" ");
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const monthIndex = monthMap[month];
      const year = new Date().getFullYear();
      // Create date at midnight (00:00:00) to avoid time-of-day issues
      const date = new Date(year, monthIndex, parseInt(day), 0, 0, 0, 0);
      return date;
    } catch (err) {
      console.warn("Failed to parse date:", dateString, err);
      return null;
    }
  }

  // Get start of current week (Sunday) at midnight
  function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    // Set to midnight for accurate comparison
    return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  }

  // Get start of current month at midnight
  function getMonthStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }
  
  // Get current date normalized to midnight
  function getTodayMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  // Find the most common reason from an array (only the top one)
  function getMostCommonReason(reasons) {
    if (reasons.length === 0) return null;
    
    const counts = {};
    reasons.forEach(reason => {
      const normalized = reason.trim().toLowerCase();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    
    return { reason: sorted[0][0], count: sorted[0][1] };
  }

  // Get all weeks in current month
  function getWeeksInCurrentMonth() {
    const today = getTodayMidnight();
    const monthStart = getMonthStart();
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of month at end of day
    
    const weeks = [];
    let currentWeekStart = getWeekStart(monthStart);
    
    while (currentWeekStart <= monthEnd) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999); // End of day Saturday
      
      const effectiveEnd = weekEnd > today ? today : weekEnd; // Don't go beyond current date
      
      weeks.push({
        start: new Date(currentWeekStart),
        end: effectiveEnd,
      });
      
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    console.log(`Found ${weeks.length} weeks in current month:`, weeks.map(w => `${w.start.toDateString()} to ${w.end.toDateString()}`));
    return weeks;
  }

  // Analyze data from trade table (for weekly reports)
  function analyzeFromTrades(startDate, endDate) {
    // Filter trades by date range
    const periodTrades = rows.filter(row => {
      const tradeDate = parseTradeDate(row["DATE/DAY"]);
      if (!tradeDate) {
        console.warn("Could not parse trade date:", row["DATE/DAY"]);
        return false;
      }
      const inRange = tradeDate >= startDate && tradeDate <= endDate;
      console.log(`Trade date: ${tradeDate.toDateString()}, Range: ${startDate.toDateString()} to ${endDate.toDateString()}, In range: ${inRange}`);
      return inRange;
    });
    
    console.log(`Filtered ${periodTrades.length} trades for range ${startDate.toDateString()} to ${endDate.toDateString()}`);

    // 1. Mismatched Instruments
    const mismatchedInstruments = periodTrades.filter(r => r._instrumentReason);
    const instrumentReasons = mismatchedInstruments.map(r => r._instrumentReason).filter(Boolean);
    
    // 2. Risk Mismatches
    const riskMismatches = periodTrades.filter(r => r._riskMismatchReason);
    const riskMismatchReasons = riskMismatches.map(r => r._riskMismatchReason).filter(Boolean);
    
    // 3. Over Risked
    const overRisked = periodTrades.filter(r => r._overRiskReason);
    const overRiskReasons = overRisked.map(r => r._overRiskReason).filter(Boolean);
    
    // 4. Early Exits
    const earlyExits = periodTrades.filter(r => r._earlyExitReason);
    const earlyExitReasons = earlyExits.map(r => r._earlyExitReason).filter(Boolean);
    
    // 5. TP/SL Analysis
    const tpTrades = periodTrades.filter(r => {
      const plValue = parseFloat(r["P/L"]);
      return !isNaN(plValue) && plValue > 0;
    });
    const slTrades = periodTrades.filter(r => {
      const plValue = parseFloat(r["P/L"]);
      return !isNaN(plValue) && plValue < 0;
    });
    
    const tpFeedback = tpTrades.map(r => r["FEEDBACK"]).filter(Boolean);
    const slFeedback = slTrades.map(r => r["FEEDBACK"]).filter(Boolean);

    return {
      totalTrades: periodTrades.length,
      mismatchedInstruments: {
        count: mismatchedInstruments.length,
        reasons: instrumentReasons,
        mostCommonReason: getMostCommonReason(instrumentReasons)
      },
      riskMismatches: {
        count: riskMismatches.length,
        reasons: riskMismatchReasons,
        mostCommonReason: getMostCommonReason(riskMismatchReasons)
      },
      overRisked: {
        count: overRisked.length,
        reasons: overRiskReasons,
        mostCommonReason: getMostCommonReason(overRiskReasons)
      },
      earlyExits: {
        count: earlyExits.length,
        reasons: earlyExitReasons,
        mostCommonReason: getMostCommonReason(earlyExitReasons)
      },
      tpAnalysis: {
        count: tpTrades.length,
        feedback: tpFeedback,
        mostCommonFeedback: getMostCommonReason(tpFeedback)
      },
      slAnalysis: {
        count: slTrades.length,
        feedback: slFeedback,
        mostCommonFeedback: getMostCommonReason(slFeedback)
      }
    };
  }

  // Aggregate weekly reports into monthly report
  function aggregateWeeklyReports(weeks) {
    const weeklyReports = weeks.map(week => analyzeFromTrades(week.start, week.end));
    
    // Aggregate all reasons from all weeks
    const allInstrumentReasons = weeklyReports.flatMap(w => w.mismatchedInstruments.reasons);
    const allRiskMismatchReasons = weeklyReports.flatMap(w => w.riskMismatches.reasons);
    const allOverRiskReasons = weeklyReports.flatMap(w => w.overRisked.reasons);
    const allEarlyExitReasons = weeklyReports.flatMap(w => w.earlyExits.reasons);
    const allTpFeedback = weeklyReports.flatMap(w => w.tpAnalysis.feedback);
    const allSlFeedback = weeklyReports.flatMap(w => w.slAnalysis.feedback);
    
    // Sum up counts
    const totalTrades = weeklyReports.reduce((sum, w) => sum + w.totalTrades, 0);
    const totalMismatchedInstruments = weeklyReports.reduce((sum, w) => sum + w.mismatchedInstruments.count, 0);
    const totalRiskMismatches = weeklyReports.reduce((sum, w) => sum + w.riskMismatches.count, 0);
    const totalOverRisked = weeklyReports.reduce((sum, w) => sum + w.overRisked.count, 0);
    const totalEarlyExits = weeklyReports.reduce((sum, w) => sum + w.earlyExits.count, 0);
    const totalTp = weeklyReports.reduce((sum, w) => sum + w.tpAnalysis.count, 0);
    const totalSl = weeklyReports.reduce((sum, w) => sum + w.slAnalysis.count, 0);

    return {
      totalTrades,
      weeklyReports, // Include weekly breakdown
      mismatchedInstruments: {
        count: totalMismatchedInstruments,
        mostCommonReason: getMostCommonReason(allInstrumentReasons)
      },
      riskMismatches: {
        count: totalRiskMismatches,
        mostCommonReason: getMostCommonReason(allRiskMismatchReasons)
      },
      overRisked: {
        count: totalOverRisked,
        mostCommonReason: getMostCommonReason(allOverRiskReasons)
      },
      earlyExits: {
        count: totalEarlyExits,
        mostCommonReason: getMostCommonReason(allEarlyExitReasons)
      },
      tpAnalysis: {
        count: totalTp,
        mostCommonFeedback: getMostCommonReason(allTpFeedback)
      },
      slAnalysis: {
        count: totalSl,
        mostCommonFeedback: getMostCommonReason(allSlFeedback)
      }
    };
  }

  // Main analysis function - determines whether to use trade data or weekly aggregation
  function analyzeFeedback(period = "weekly") {
    console.log(`Analyzing feedback for period: ${period}`);
    console.log(`Total rows in table: ${rows.length}`);
    
    if (period === "weekly") {
      // Weekly report: Analyze directly from trade table
      const today = getTodayMidnight();
      const weekStart = getWeekStart();
      console.log(`Weekly analysis from ${weekStart.toDateString()} to ${today.toDateString()}`);
      return analyzeFromTrades(weekStart, today);
    } else {
      // Monthly report: Aggregate from weekly reports
      console.log("Starting monthly analysis - aggregating weekly reports");
      const weeks = getWeeksInCurrentMonth();
      return aggregateWeeklyReports(weeks);
    }
  }

  // Load data on mount or account switch
  useEffect(() => {
    setLoaded(false); // Reset loaded state
    setExpectedRisk(""); // Reset expected risk for new account
    async function load() {
      const key = accountKey;
      console.log("Loading account:", key);
      
      let accountData = null;
      
      // 1️⃣ Try local storage first (Electron or Browser)
      if (hasElectron) {
        const raw = window.electronAPI.readLocalFile(localFileName(key));
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log("Loaded from local cache:", parsed);
          accountData = parsed;
        }
      } else {
        // Try browser localStorage
        const stored = localStorage.getItem(`account_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("Loaded from browser storage:", parsed);
          accountData = parsed;
        }
      }

      // 2️⃣ Try Firebase (only if no local data)
      if (!accountData) {
        try {
          const ref = doc(db, "accounts", encodeURIComponent(key));
          const snap = await getDoc(ref);
          if (snap.exists()) {
            accountData = snap.data();
            console.log("Loaded from Firebase:", accountData);
          }
        } catch (err) {
          console.warn("Firebase load failed (using local-only mode):", err.message);
        }
      }

      // 3️⃣ Process loaded data
      if (!accountData) {
        // No data found - start fresh
        console.log("No existing data, starting fresh");
        const newMonthKey = getMonthKey();
        setCurrentMonthKey(newMonthKey);
        setRows([emptyRow()]);
        setExpectedRisk("");
        setPreviousMonthData(null);
        setMonthlySummaries({});
      } else {
        // Handle different data formats
        if (Array.isArray(accountData)) {
          // Old format: just rows array - migrate to new structure
          console.log("Migrating old format to new structure");
          const newMonthKey = getMonthKey();
          setCurrentMonthKey(newMonthKey);
          setRows(accountData);
          setExpectedRisk("");
          setPreviousMonthData(null);
          setMonthlySummaries({});
        } else if (accountData.rows && !accountData.currentMonthKey) {
          // Intermediate format: has rows and expectedRisk but no month tracking
          console.log("Migrating intermediate format to monthly tracking");
          const newMonthKey = getMonthKey();
          setCurrentMonthKey(newMonthKey);
          setRows(accountData.rows || [emptyRow()]);
          setExpectedRisk(accountData.expectedRisk || "");
          setPreviousMonthData(null);
          setMonthlySummaries({});
        } else {
          // New format with monthly tracking
          console.log("Loading full monthly tracking data");
          const newMonthKey = getMonthKey();
          
          // Check if month changed - perform rotation if needed
          if (accountData.currentMonthKey && accountData.currentMonthKey !== newMonthKey) {
            console.log(`🔄 Month changed from ${accountData.currentMonthKey} to ${newMonthKey}`);
            accountData = performMonthRotation({
              currentMonthKey: accountData.currentMonthKey,
              rows: accountData.rows || [],
              expectedRisk: accountData.expectedRisk || "",
              previousMonthData: accountData.previousMonthData || null,
              monthlySummaries: accountData.monthlySummaries || {}
            });
          }
          
          // Set state
          setCurrentMonthKey(accountData.currentMonthKey || newMonthKey);
          setRows(accountData.rows || [emptyRow()]);
          setExpectedRisk(accountData.expectedRisk || "");
          setPreviousMonthData(accountData.previousMonthData || null);
          setMonthlySummaries(accountData.monthlySummaries || {});
        }
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
      const dataToSave = {
        currentMonthKey,
        rows,
        expectedRisk,
        previousMonthData,
        monthlySummaries
      };
      
      // Save locally ONLY (if Electron)
    if (hasElectron) {
        try {
      window.electronAPI.writeLocalFile(
        localFileName(key),
        JSON.stringify(dataToSave, null, 2)
      );
          console.log("✓ Auto-saved to local storage");
        } catch (err) {
          console.warn("Local save failed:", err);
        }
      } else {
        // For web version, save to localStorage
        try {
          localStorage.setItem(`account_${key}`, JSON.stringify(dataToSave));
          console.log("✓ Auto-saved to browser storage");
        } catch (err) {
          console.warn("Browser storage failed:", err);
        }
      }
    }, 500); // Fast local save

    return () => clearTimeout(timer);
  }, [rows, expectedRisk, currentMonthKey, previousMonthData, monthlySummaries, loaded, accountKey]);

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
  
  // Validate calculated risk against expected risk
  const validateCalculatedRisk = (id, value) => {
    const trimmedValue = value.trim();
    const trimmedExpected = expectedRisk.trim();
    
    // Only validate if both values exist and don't match
    if (trimmedExpected !== "" && trimmedValue !== "" && trimmedValue !== trimmedExpected) {
      // Check if already has a reason
      const row = rows.find(r => r._id === id);
      if (!row?._riskMismatchReason) {
        // Ask for reason
        setReasonDialog({ open: true, rowId: id, instrument: "", type: "riskmismatch" });
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
    } else if (type === "riskmismatch") {
      setRows((prev) => 
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "_riskMismatchReason": tempReason } 
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
    } else if (type === "riskmismatch") {
      setRows((prev) =>
        prev.map((r) => 
          r._id === rowId 
            ? { ...r, "CALCULATED RISK": "" } 
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
    
    // Immediately sync new row to cloud with full monthly data
    const key = accountKey;
    console.log("Adding new row, syncing to cloud...");
    
    const dataToSave = {
      currentMonthKey,
      rows: updatedRows,
      expectedRisk,
      previousMonthData,
      monthlySummaries
    };
    
    setDoc(doc(db, "accounts", encodeURIComponent(key)), dataToSave, { merge: true })
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
    
    // Immediately sync deletion to cloud with full monthly data
    const key = accountKey;
    console.log("Deleting row, syncing to cloud...");
    
    const dataToSave = {
      currentMonthKey,
      rows: updatedRows,
      expectedRisk,
      previousMonthData,
      monthlySummaries
    };
    
    setDoc(doc(db, "accounts", encodeURIComponent(key)), dataToSave, { merge: true })
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
        p: { xs: 1, sm: 2, md: 0 }, // Responsive padding
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      {/* Professional Header - Mobile Responsive */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: { xs: 1, sm: 2 },
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    color: "text.primary",
                    fontSize: { xs: "1.25rem", sm: "1.75rem", md: "2rem" } // Responsive font
                  }}
                >
                  {accountKey.split("/")[1]}
                </Typography>
                <Tooltip title="Rename Account">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setNewAccountName(accountKey.split("/")[1]);
                      setRenameDialogOpen(true);
                    }}
                    sx={{
                      color: "#7f1d1d",
                      "&:hover": {
                        bgcolor: "rgba(127, 29, 29, 0.1)",
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
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
                  label="Auto-saved"
                  size="small"
                  sx={{
                    bgcolor: "rgba(21, 128, 61, 0.1)",
                    color: "#15803d",
                    border: "1px solid rgba(21, 128, 61, 0.2)",
                    fontWeight: 500,
                    fontSize: 11,
                  }}
                />
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {accountKey.split("/")[0]} • {rows.length} {rows.length === 1 ? "trade" : "trades"}
      </Typography>
          </Box>
          {/* Two Row Layout for Buttons - Mobile Responsive */}
          <Stack spacing={1.5} sx={{ width: { xs: "100%", md: "auto" } }}>
            {/* Row 1: Primary Actions */}
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center" 
              flexWrap="wrap" 
              sx={{ gap: { xs: 0.5, sm: 1 } }}
            >
              <TextField
                label="Expected Risk"
                value={expectedRisk}
                onChange={(e) => setExpectedRisk(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="e.g., 100"
                sx={{
                  width: { xs: "100%", sm: 130 }, // Full width on mobile
                  "& .MuiInputBase-root": {
                    backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
                    height: "36px",
                  },
                  "& .MuiInputBase-input": {
                    color: mode === "dark" ? "#f87171" : "#7f1d1d",
                    fontWeight: 500,
                    fontSize: 12,
                  },
                  "& .MuiInputLabel-root": {
                    color: "#6b7280",
                    fontSize: 11,
                  },
                  "& fieldset": { 
                    borderColor: "#d1d5db",
                  },
                  "&:hover fieldset": {
                    borderColor: "#7f1d1d",
                  },
                  "& .Mui-focused fieldset": {
                    borderColor: "#7f1d1d",
                  },
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={addRow}
                sx={{
                  px: 2,
                  py: 0.75,
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: 500,
                  minWidth: { xs: "auto", sm: "auto" },
                  flex: { xs: "1 1 auto", sm: "0 0 auto" }, // Grow on mobile
                }}
              >
            + Add Trade
          </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
                // Save to Firebase Cloud with full monthly data
                const key = accountKey;
                setSaving(true);
                console.log("Manual cloud save - Rows:", rows);
                const dataToSave = {
                  currentMonthKey,
                  rows,
                  expectedRisk,
                  previousMonthData,
                  monthlySummaries
                };
                
                setDoc(doc(db, "accounts", encodeURIComponent(key)), dataToSave, { merge: true })
                  .then(() => {
                    // Also save locally
            if (hasElectron) {
              window.electronAPI.writeLocalFile(
                        localFileName(key),
                        JSON.stringify(dataToSave, null, 2)
                      );
                    } else {
                      localStorage.setItem(`account_${key}`, JSON.stringify(dataToSave));
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
                      console.log("1. Go to: https://console.firebase.com/");
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
                px: 2,
                py: 0.75,
                fontSize: 12,
                fontWeight: 500,
                minWidth: "auto",
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                // Prepare data for Excel export
                const excelData = rows.map((row, index) => {
                  const cleanRow = {};
                  columns.forEach(col => {
                    cleanRow[col] = row[col] || "";
                  });
                  // Add metadata columns
                  if (row._instrumentReason) cleanRow["Instrument Change Reason"] = row._instrumentReason;
                  if (row._riskMismatchReason) cleanRow["Risk Mismatch Reason"] = row._riskMismatchReason;
                  if (row._overRiskReason) cleanRow["Over Risk Reason"] = row._overRiskReason;
                  if (row._earlyExitReason) cleanRow["Early Exit Reason"] = row._earlyExitReason;
                  return cleanRow;
                });

                // Create worksheet from data
                const ws = window.XLSX?.utils?.json_to_sheet(excelData);
                
                if (!ws) {
                  // Fallback to CSV if XLSX not available
                  const csvContent = [
                    columns.join(","),
                    ...rows.map(row => columns.map(col => `"${(row[col] || "").toString().replace(/"/g, '""')}"`).join(","))
                  ].join("\n");
                  
                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${accountKey.replace(/[\\/\\s:]/g, "_")}_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  return;
                }

                // Create workbook and add worksheet
                const wb = window.XLSX.utils.book_new();
                window.XLSX.utils.book_append_sheet(wb, ws, "Trades");
                
                // Add a summary sheet
                const summaryData = [
                  { Metric: "Account", Value: accountKey },
                  { Metric: "Total Trades", Value: rows.length },
                  { Metric: "Expected Risk", Value: expectedRisk || "Not Set" },
                  { Metric: "Export Date", Value: new Date().toLocaleString() },
                ];
                const wsSummary = window.XLSX.utils.json_to_sheet(summaryData);
                window.XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
                
                // Generate Excel file and download
                const fileName = `${accountKey.replace(/[\\/\\s:]/g, "_")}_${new Date().toISOString().split('T')[0]}.xlsx`;
                window.XLSX.writeFile(wb, fileName);
              }}
              sx={{
                px: 2,
                py: 0.75,
                fontSize: 12,
                fontWeight: 500,
                minWidth: "auto",
              }}
            >
              Excel
            </Button>
            </Stack>

            {/* Row 2: Analytics & Tools */}
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center" 
              flexWrap="wrap"
              sx={{ gap: { xs: 0.5, sm: 1 } }}
            >
              <Button
                variant="outlined"
                onClick={() => setFeedbackDialogOpen(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: "auto",
                }}
              >
                Report
              </Button>
              <Button
                variant="outlined"
                onClick={() => setArchiveDialogOpen(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: "auto",
                  borderColor: "#7f1d1d",
                  color: "#7f1d1d",
                  "&:hover": {
                    borderColor: "#7f1d1d",
                    bgcolor: "rgba(127, 29, 29, 0.05)",
                  },
                }}
              >
                📅 Archive
              </Button>
              <Button
                variant="contained"
                onClick={() => setDashboardDialogOpen(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: "auto",
                  bgcolor: "#8b5cf6",
                  "&:hover": {
                    bgcolor: "#7c3aed",
                  },
                }}
              >
                📊 Dashboard
              </Button>
              <Button
                variant="contained"
                onClick={() => setAnalyticsDialogOpen(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: "auto",
                  bgcolor: "#6366f1",
                  "&:hover": {
                    bgcolor: "#4f46e5",
                  },
                }}
              >
                📊 Analytics
              </Button>
              <Button
                variant="contained"
                onClick={() => setAchievementsDialogOpen(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: "auto",
                  bgcolor: "#fbbf24",
                  color: "#78350f",
                  "&:hover": {
                    bgcolor: "#f59e0b",
                  },
                }}
              >
                🏆 Achievements
              </Button>
              
              {/* Notifications Toggle */}
              <Tooltip title={notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}>
                <IconButton
                  onClick={() => {
                    if (!notificationsEnabled && "Notification" in window) {
                      Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                          setNotificationsEnabled(true);
                          new Notification("📊 Notifications Enabled", {
                            body: "You'll now receive trading alerts!",
                            icon: "/icon.png"
                          });
                        }
                      });
                    } else {
                      setNotificationsEnabled(!notificationsEnabled);
                    }
                  }}
                  sx={{
                    color: notificationsEnabled ? "#ef4444" : "#6b7280",
                    border: "1px solid",
                    borderColor: notificationsEnabled ? "#ef4444" : "#d1d5db",
                    "&:hover": {
                      bgcolor: notificationsEnabled ? "rgba(239, 68, 68, 0.1)" : "rgba(107, 114, 128, 0.1)",
                    }
                  }}
                  size="small"
                >
                  <NotificationsActiveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                <IconButton
                  onClick={toggleTheme}
                  sx={{
                    color: mode === "dark" ? "#fbbf24" : "#1f2937",
                    border: "1px solid",
                    borderColor: mode === "dark" ? "#fbbf24" : "#d1d5db",
                    "&:hover": {
                      bgcolor: mode === "dark" ? "rgba(251, 191, 36, 0.1)" : "rgba(31, 41, 55, 0.05)",
                    }
                  }}
                  size="small"
                >
                  {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {/* Month Display - Mobile Responsive */}
      <Box
        sx={{
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderBottom: isWeekend() ? "1px solid" : "none",
          borderBottomColor: "divider",
          p: { xs: 1, sm: 1.5 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 500,
            color: "text.secondary",
            letterSpacing: 0.5,
            fontSize: { xs: 12, sm: 14 },
          }}
        >
          {getCurrentMonthYear()}
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
              bgcolor: mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "rgba(153, 27, 27, 0.05)",
              border: "1px solid",
              borderColor: mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "rgba(153, 27, 27, 0.15)",
              borderTop: "none",
              p: 2,
              mb: 2,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: mode === "dark" ? "#fca5a5" : "#991b1b",
                    fontSize: 15,
                  }}
                >
                  Market Closed - {new Date().getDay() === 0 ? "Sunday" : "Saturday"}
                </Typography>
                {total > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 3,
                      px: 3,
                      py: 1,
                      bgcolor: "background.paper",
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
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
                  color={isGoodPerformance ? "success" : "primary"}
                  onClick={() => setPerformanceDialogOpen(true)}
                  sx={{
                    fontWeight: 500,
                    px: 3,
                    fontSize: 13,
                  }}
                >
                  {isGoodPerformance ? "View Analysis" : "View Feedback"}
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
              fontWeight: 600, 
              fontSize: 20,
              background: "#fafafa",
              borderBottom: "1px solid #e5e7eb",
              color: "#1f2937",
            }}>
              Performance Analysis
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
                      p: 3,
                      background: "rgba(34, 197, 94, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(34, 197, 94, 0.25)",
                    }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "#22c55e",
                          mb: 2,
                        }}
                      >
                        Excellent Work
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: "text.secondary",
                          lineHeight: 1.6,
                          fontSize: 14,
                        }}
                      >
                        You had more Take Profits than Stop Losses! Keep up the great discipline and strategy execution. 
                        Review your winning trades and replicate those patterns next week.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      p: 3,
                      background: "rgba(59, 130, 246, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                    }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "#60a5fa",
                          mb: 2,
                          textAlign: "center",
                        }}
                      >
                        Areas to Improve
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

      {/* Modern Table Card - Mobile Responsive */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: { xs: 1, sm: 2 },
          overflow: "auto", // Horizontal scroll on mobile
          border: "2px solid",
          borderColor: "divider",
          boxShadow: mode === "dark" ? "0 1px 3px rgba(0, 0, 0, 0.5)" : "0 1px 3px rgba(0, 0, 0, 0.1)",
          // Smooth scrolling on mobile
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": {
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#7f1d1d",
            borderRadius: "4px",
          },
        }}
      >
        {/* Table Container */}
      <Box
        sx={{
          display: "grid",
            gridTemplateColumns: "120px 140px 100px 140px 120px 120px 140px 1fr 80px",
            gap: 0,
            minWidth: "1200px", // Ensures horizontal scroll on mobile
        }}
      >
        {/* Header */}
        {columns.map((c) => (
          <Box
            key={c}
            sx={{
                p: 1.25,
                fontWeight: 700,
                fontSize: 11,
              textAlign: "center",
                background: mode === "dark" 
                  ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
                  : "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
                borderBottom: mode === "dark" ? "3px solid #0f172a" : "3px solid #5c0f0f",
                color: "#ffffff",
                textTransform: "uppercase",
                letterSpacing: 0.5,
            }}
          >
            {c}
          </Box>
        ))}
        <Box
          sx={{
              p: 1.25,
              fontWeight: 700,
              fontSize: 11,
            textAlign: "center",
              background: mode === "dark" 
                ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
                : "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
              borderBottom: mode === "dark" ? "3px solid #0f172a" : "3px solid #5c0f0f",
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 0.5,
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
                    borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                    backgroundColor: idx % 2 === 0 
                      ? "#ffffff" 
                      : "#f9fafb",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#1f2937",
                      "& .MuiInputBase-input": {
                        color: "#ffffff !important",
                      },
                      "& .MuiInputBase-root": {
                        backgroundColor: "#374151 !important",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#4b5563 !important",
                      },
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
                          bgcolor: "#1f2937",
                          border: "1px solid #374151",
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
                            backgroundColor: "#fafafa",
                            borderRadius: 0,
                            padding: "4px 8px",
                            transition: "all 0.2s ease",
                          },
                      "& .MuiInputBase-input": {
                        textAlign: "left",
                        verticalAlign: "top",
                            color: "#1f2937",
                            fontSize: 12,
                            padding: "2px 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            transition: "color 0.2s ease",
                            "&:focus": {
                              whiteSpace: "normal",
                            },
                          },
                          "& fieldset": { 
                            borderColor: "#d1d5db",
                            transition: "border-color 0.2s ease",
                          },
                          "&:hover fieldset": {
                            borderColor: "#7f1d1d",
                          },
                          "& .Mui-focused fieldset": {
                            borderColor: "#7f1d1d",
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
                  ) : c === "CALCULATED RISK" && r._riskMismatchReason ? (
                    <Tooltip 
                      title={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            ⚠️ Risk Mismatch
                          </Typography>
                          <Typography variant="body2">
                            Expected: {expectedRisk}
                          </Typography>
                          <Typography variant="body2">
                            Actual: {r[c]}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            Reason: {r._riskMismatchReason}
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
                          bgcolor: "rgba(127, 29, 29, 0.95)",
                          border: "1px solid rgba(127, 29, 29, 0.5)",
                        }
                      }}
                    >
                      <TextField
                        value={r[c] || ""}
                        onChange={(e) => updateCell(r._id, c, e.target.value)}
                        onBlur={(e) => validateCalculatedRisk(r._id, e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="..."
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: "rgba(127, 29, 29, 0.1)",
                            borderRadius: 0,
                            height: "32px",
                            border: "1px solid rgba(127, 29, 29, 0.3)",
                          },
                          "& .MuiInputBase-input": {
                            textAlign: "center",
                            color: "#7f1d1d",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "6px 8px",
                          },
                          "& fieldset": { 
                            borderColor: "rgba(127, 29, 29, 0.3)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(127, 29, 29, 0.5)",
                          },
                          "& .Mui-focused fieldset": {
                            borderColor: "primary.main",
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
                ) : c === "P/L" ? (
                  <TextField
                    value={r[c] || ""}
                    onChange={(e) => updateCell(r._id, c, e.target.value)}
                    type="number"
                    variant="outlined"
                    fullWidth
                    placeholder="Enter P/L"
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        backgroundColor: (() => {
                          const val = parseFloat(r[c]);
                          if (isNaN(val) || val === 0) return mode === "dark" ? "#1e293b" : "#ffffff";
                          return val > 0 
                            ? (mode === "dark" ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)")
                            : (mode === "dark" ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)");
                        })(),
                        borderRadius: 0,
                        height: "32px",
                        transition: "all 0.2s ease",
                      },
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        color: (() => {
                          const val = parseFloat(r[c]);
                          if (isNaN(val) || val === 0) return mode === "dark" ? "#f1f5f9" : "#1f2937";
                          return val > 0 ? "#10b981" : "#ef4444";
                        })(),
                        fontWeight: 600,
                        fontSize: 13,
                        padding: "6px 8px",
                        transition: "color 0.2s ease",
                      },
                      "& fieldset": { 
                        borderColor: (() => {
                          const val = parseFloat(r[c]);
                          if (isNaN(val) || val === 0) return mode === "dark" ? "#475569" : "#d1d5db";
                          return val > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
                        })(),
                        transition: "border-color 0.2s ease",
                      },
                      "&:hover fieldset": {
                        borderColor: (() => {
                          const val = parseFloat(r[c]);
                          if (isNaN(val) || val === 0) return mode === "dark" ? "#f87171" : "#7f1d1d";
                          return val > 0 ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)";
                        })(),
                      },
                      "& .Mui-focused fieldset": {
                        borderColor: mode === "dark" ? "#818cf8" : "#6366f1",
                      },
                    }}
                  />
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
                        // Validate CALCULATED RISK field
                        if (c === "CALCULATED RISK") {
                          validateCalculatedRisk(r._id, e.target.value);
                        }
                      }}
                    variant="outlined"
                    fullWidth
                      placeholder="..."
                      size="small"
                    sx={{
                        "& .MuiInputBase-root": {
                          backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
                          borderRadius: 0,
                          height: "32px",
                          transition: "all 0.2s ease",
                        },
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                          color: mode === "dark" ? "#f1f5f9" : "#1f2937",
                          fontWeight: 500,
                          fontSize: 12,
                          padding: "6px 8px",
                          transition: "color 0.2s ease",
                        },
                        "& fieldset": { 
                          borderColor: "#d1d5db",
                          transition: "border-color 0.2s ease",
                        },
                        "&:hover fieldset": {
                          borderColor: "#7f1d1d",
                        },
                        "& .Mui-focused fieldset": {
                          borderColor: "#7f1d1d",
                        },
                    }}
                  />
                )}
              </Box>
            ))}
            <Box
              sx={{
                  p: 0.25,
                  borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                  backgroundColor: idx % 2 === 0 
                    ? "#ffffff" 
                    : "#f9fafb",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "#1f2937",
                    "& .MuiSvgIcon-root": {
                      color: "#ffffff",
                    },
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
                        backgroundColor: "rgba(239, 68, 68, 0.2)",
                        transform: "scale(1.1)",
                        "& .MuiSvgIcon-root": {
                          color: "#ef4444",
                        },
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
            background: "#15803d",
            borderRadius: 1.5,
            fontSize: 14,
            fontWeight: 500,
            color: "#ffffff",
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
          Saved to cloud successfully
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
          color: reasonDialog.type === "overrisk" ? "error.main" : reasonDialog.type === "riskmismatch" ? "info.main" : "warning.main" 
        }}>
          {reasonDialog.type === "overrisk" 
            ? "⚠️ Over-Risked Detected" 
            : reasonDialog.type === "earlyexit"
            ? "⚠️ Early Exit Detected"
            : reasonDialog.type === "riskmismatch"
            ? "⚠️ Risk Mismatch Detected"
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
          ) : reasonDialog.type === "riskmismatch" ? (
            <>
              <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                The calculated risk doesn't match the expected risk amount.
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                Expected Risk: <strong style={{ color: "#6366f1" }}>{expectedRisk}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                Please explain why the risk amount is different:
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
                : reasonDialog.type === "riskmismatch"
                ? "e.g., Changed position size, Different lot size, Adjusted for volatility..."
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
            color={reasonDialog.type === "overrisk" ? "error" : reasonDialog.type === "riskmismatch" ? "info" : "warning"}
            disabled={!tempReason.trim()}
          >
            Save Reason
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comprehensive Feedback Report Dialog */}
      <Dialog
        open={feedbackDialogOpen}
        onClose={() => setFeedbackDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 3,
            maxHeight: "90vh",
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          fontSize: 18,
          background: "#fafafa",
          borderBottom: "1px solid #e5e7eb",
          color: "#1f2937",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            Trading Performance Report
            <Chip 
              label={accountKey.split("/")[0]} 
              size="small" 
              sx={{ 
                bgcolor: "rgba(127, 29, 29, 0.1)", 
                color: "#7f1d1d",
                fontWeight: 500,
                fontSize: 11,
                border: "1px solid rgba(127, 29, 29, 0.2)",
              }} 
            />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Tabs
            value={feedbackView}
            onChange={(e, newValue) => setFeedbackView(newValue)}
            sx={{ 
              borderBottom: "1px solid #e5e7eb",
              bgcolor: "#f9fafb",
              "& .MuiTab-root": {
                fontWeight: 500,
                fontSize: 13,
                color: "#6b7280",
              },
              "& .Mui-selected": {
                color: "#7f1d1d !important",
              },
            }}
          >
            <Tab label="This Week" value="weekly" />
            <Tab label="This Month" value="monthly" />
          </Tabs>

          {(() => {
            const analysis = analyzeFeedback(feedbackView);
            const periodLabel = feedbackView === "weekly" ? "This Week" : "This Month";

            return (
              <Box sx={{ p: 3 }}>
                {/* Data Source Indicator */}
                {feedbackView === "monthly" && (
                  <Box sx={{ 
                    mb: 2, 
                    p: 1.5, 
                    background: "rgba(127, 29, 29, 0.05)",
                    border: "1px solid rgba(127, 29, 29, 0.15)",
                    borderRadius: 1.5,
                  }}>
                    <Typography variant="caption" sx={{ color: "#7f1d1d", fontWeight: 500, fontSize: 11 }}>
                      📊 Monthly data aggregated from {analysis.weeklyReports?.length || 0} weekly report{analysis.weeklyReports?.length !== 1 ? 's' : ''} in this month
                    </Typography>
                  </Box>
                )}
                {feedbackView === "weekly" && (
                  <Box sx={{ 
                    mb: 2, 
                    p: 1.5, 
                    background: "rgba(21, 128, 61, 0.05)",
                    border: "1px solid rgba(21, 128, 61, 0.15)",
                    borderRadius: 1.5,
                  }}>
                    <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 500, fontSize: 11, display: "block" }}>
                      📈 Weekly data analyzed directly from trade entries
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 10, display: "block", mt: 0.5 }}>
                      Date range: {getWeekStart().toLocaleDateString()} - {getTodayMidnight().toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 10, display: "block" }}>
                      Check browser console (F12) for detailed date filtering logs
                    </Typography>
                  </Box>
                )}

                {/* Summary Card */}
                <Card sx={{ 
                  mb: 3, 
                  background: "#fafafa",
                  border: "1px solid #e5e7eb",
                }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1f2937", fontSize: 15 }}>
                      {periodLabel} Summary
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12 }}>
                          Total Trades
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#6366f1" }}>
                          {analysis.totalTrades}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12 }}>
                          Take Profits
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#10b981" }}>
                          {analysis.tpAnalysis.count}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12 }}>
                          Stop Losses
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#ef4444" }}>
                          {analysis.slAnalysis.count}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Issues Analysis */}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
                  📋 Issues & Patterns
                </Typography>

                {/* 1. Mismatched Instruments */}
                <Card sx={{ mb: 2, bgcolor: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fbbf24" }}>
                        ⚠️ Mismatched Instruments
                      </Typography>
                      <Chip 
                        label={analysis.mismatchedInstruments.count} 
                        size="small"
                        sx={{ bgcolor: "#fbbf24", color: "white", fontWeight: 700 }}
                      />
                    </Box>
                    {analysis.mismatchedInstruments.count > 0 ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontSize: 12 }}>
                          Most Common Reason:
                        </Typography>
                        {analysis.mismatchedInstruments.mostCommonReason ? (
                          <Box sx={{ 
                            bgcolor: "rgba(245, 158, 11, 0.1)", 
                            p: 1.5, 
                            borderRadius: 1,
                            border: "1px solid rgba(245, 158, 11, 0.2)"
                          }}>
                            <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13, mb: 0.5 }}>
                              {analysis.mismatchedInstruments.mostCommonReason.reason}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#fbbf24", fontSize: 11, fontWeight: 500 }}>
                              Occurred {analysis.mismatchedInstruments.mostCommonReason.count} time{analysis.mismatchedInstruments.mostCommonReason.count > 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            No reason recorded
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        ✅ Great! No mismatched instruments this {feedbackView === "weekly" ? "week" : "month"}.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Risk Mismatches */}
                <Card sx={{ mb: 2, bgcolor: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#60a5fa" }}>
                        💰 Risk Amount Mismatches
                      </Typography>
                      <Chip 
                        label={analysis.riskMismatches.count} 
                        size="small"
                        sx={{ bgcolor: "#60a5fa", color: "white", fontWeight: 700 }}
                      />
                    </Box>
                    {analysis.riskMismatches.count > 0 ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontSize: 12 }}>
                          Most Common Reason:
                        </Typography>
                        {analysis.riskMismatches.mostCommonReason ? (
                          <Box sx={{ 
                            bgcolor: "rgba(59, 130, 246, 0.1)", 
                            p: 1.5, 
                            borderRadius: 1,
                            border: "1px solid rgba(59, 130, 246, 0.2)"
                          }}>
                            <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13, mb: 0.5 }}>
                              {analysis.riskMismatches.mostCommonReason.reason}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#60a5fa", fontSize: 11, fontWeight: 500 }}>
                              Occurred {analysis.riskMismatches.mostCommonReason.count} time{analysis.riskMismatches.mostCommonReason.count > 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            No reason recorded
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        ✅ Perfect! All trades matched expected risk this {feedbackView === "weekly" ? "week" : "month"}.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Over Risked */}
                <Card sx={{ mb: 2, bgcolor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#ef4444" }}>
                        🚨 Over Risked Trades
                      </Typography>
                      <Chip 
                        label={analysis.overRisked.count} 
                        size="small"
                        sx={{ bgcolor: "#ef4444", color: "white", fontWeight: 700 }}
                      />
                    </Box>
                    {analysis.overRisked.count > 0 ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontSize: 12 }}>
                          Most Common Reason:
                        </Typography>
                        {analysis.overRisked.mostCommonReason ? (
                          <Box sx={{ 
                            bgcolor: "rgba(239, 68, 68, 0.1)", 
                            p: 1.5, 
                            borderRadius: 1,
                            border: "1px solid rgba(239, 68, 68, 0.2)"
                          }}>
                            <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13, mb: 0.5 }}>
                              {analysis.overRisked.mostCommonReason.reason}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#ef4444", fontSize: 11, fontWeight: 500 }}>
                              Occurred {analysis.overRisked.mostCommonReason.count} time{analysis.overRisked.mostCommonReason.count > 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            No reason recorded
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        ✅ Excellent! No over-risked trades this {feedbackView === "weekly" ? "week" : "month"}.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Early Exits */}
                <Card sx={{ mb: 2, bgcolor: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fbbf24" }}>
                        ⏱️ Early Exit Trades
                      </Typography>
                      <Chip 
                        label={analysis.earlyExits.count} 
                        size="small"
                        sx={{ bgcolor: "#fbbf24", color: "white", fontWeight: 700 }}
                      />
                    </Box>
                    {analysis.earlyExits.count > 0 ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontSize: 12 }}>
                          Most Common Reason:
                        </Typography>
                        {analysis.earlyExits.mostCommonReason ? (
                          <Box sx={{ 
                            bgcolor: "rgba(245, 158, 11, 0.1)", 
                            p: 1.5, 
                            borderRadius: 1,
                            border: "1px solid rgba(245, 158, 11, 0.2)"
                          }}>
                            <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13, mb: 0.5 }}>
                              {analysis.earlyExits.mostCommonReason.reason}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#fbbf24", fontSize: 11, fontWeight: 500 }}>
                              Occurred {analysis.earlyExits.mostCommonReason.count} time{analysis.earlyExits.mostCommonReason.count > 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            No reason recorded
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        ✅ Good! No early exits this {feedbackView === "weekly" ? "week" : "month"}.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                <Divider sx={{ my: 3 }} />

                {/* TP/SL Feedback Analysis */}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
                  📈 Trade Outcomes Analysis
                </Typography>

                {/* Take Profit Feedback */}
                <Card sx={{ mb: 2, bgcolor: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#10b981" }}>
                        ✅ Take Profit Trades ({analysis.tpAnalysis.count})
                      </Typography>
                    </Box>
                    {analysis.tpAnalysis.mostCommonFeedback ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontSize: 12 }}>
                          Most Common Feedback:
                        </Typography>
                        <Box sx={{ 
                          bgcolor: "rgba(16, 185, 129, 0.1)", 
                          p: 1.5, 
                          borderRadius: 1,
                          border: "1px solid rgba(16, 185, 129, 0.2)"
                        }}>
                          <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13, mb: 0.5 }}>
                            {analysis.tpAnalysis.mostCommonFeedback.reason}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#10b981", fontSize: 11, fontWeight: 500 }}>
                            Occurred {analysis.tpAnalysis.mostCommonFeedback.count} time{analysis.tpAnalysis.mostCommonFeedback.count > 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", fontSize: 12 }}>
                        No feedback recorded for TP trades yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Stop Loss Feedback */}
                <Card sx={{ mb: 2, bgcolor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#ef4444" }}>
                        ❌ Stop Loss Trades ({analysis.slAnalysis.count})
                      </Typography>
                    </Box>
                    {analysis.slAnalysis.mostCommonFeedback ? (
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontSize: 12 }}>
                          Most Common Feedback:
                        </Typography>
                        <Box sx={{ 
                          bgcolor: "rgba(239, 68, 68, 0.1)", 
                          p: 1.5, 
                          borderRadius: 1,
                          border: "1px solid rgba(239, 68, 68, 0.2)"
                        }}>
                          <Typography variant="body2" sx={{ color: "text.primary", fontSize: 13, mb: 0.5 }}>
                            {analysis.slAnalysis.mostCommonFeedback.reason}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#ef4444", fontSize: 11, fontWeight: 500 }}>
                            Occurred {analysis.slAnalysis.mostCommonFeedback.count} time{analysis.slAnalysis.mostCommonFeedback.count > 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", fontSize: 12 }}>
                        No feedback recorded for SL trades yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Win Rate */}
                {(analysis.tpAnalysis.count + analysis.slAnalysis.count) > 0 && (
                  <Card sx={{ 
                    mt: 3,
                    background: "#fafafa",
                    border: "1px solid #e5e7eb",
                  }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1f2937", fontSize: 15 }}>
                        Win Rate
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: "#7f1d1d" }}>
                          {((analysis.tpAnalysis.count / (analysis.tpAnalysis.count + analysis.slAnalysis.count)) * 100).toFixed(1)}%
                        </Typography>
                        <Box>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {analysis.tpAnalysis.count} wins out of {analysis.tpAnalysis.count + analysis.slAnalysis.count} closed trades
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(99, 102, 241, 0.2)" }}>
          <Button onClick={() => setFeedbackDialogOpen(false)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog with Charts */}
      <Dialog
        open={analyticsDialogOpen}
        onClose={() => setAnalyticsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 3,
            maxHeight: "90vh",
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          fontSize: 18,
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          color: "white",
          borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              📊 Performance Analytics
              <Chip 
                label={accountKey.split("/")[1]} 
                size="small" 
                sx={{ 
                  bgcolor: "rgba(255, 255, 255, 0.2)", 
                  color: "white",
                  fontWeight: 500,
                  fontSize: 11,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }} 
              />
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
              {rows.length} total trades
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Tabs
            value={analyticsTab}
            onChange={(e, newValue) => setAnalyticsTab(newValue)}
            sx={{ 
              borderBottom: "1px solid #e5e7eb",
              bgcolor: "#f9fafb",
              "& .MuiTab-root": {
                fontWeight: 500,
                fontSize: 13,
                color: "#6b7280",
              },
              "& .Mui-selected": {
                color: "#6366f1 !important",
              },
              "& .MuiTabs-indicator": {
                bgcolor: "#6366f1",
              },
            }}
          >
            <Tab label="📈 Performance Trends" />
            <Tab label="🎯 Win Rate Analysis" />
            <Tab label="💹 Instrument Performance" />
            <Tab label="🧠 AI Insights" />
            <Tab label="📅 Historical" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {analyticsTab === 0 && (
              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Track your profit and loss trends over time. The cumulative P/L line shows your overall account growth.
                </Typography>
                <PerformanceCharts rows={rows} />
              </Box>
            )}
            
            {analyticsTab === 1 && (
              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Analyze your win rate patterns and see how your TP vs SL ratio changes over time.
                </Typography>
                <WinRateGraphs rows={rows} />
              </Box>
            )}
            
            {analyticsTab === 2 && (
              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Discover which instruments are most profitable and which ones need improvement.
                </Typography>
                <InstrumentAnalysis rows={rows} />
              </Box>
            )}
            
            {analyticsTab === 3 && (
              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  AI-powered pattern recognition identifies recurring mistakes and provides personalized trading suggestions.
                </Typography>
                <TradingInsights rows={rows} />
              </Box>
            )}
            
            {analyticsTab === 4 && (
              <Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Compare this month's performance with previous months to track your progress over time.
                </Typography>
                <HistoricalComparison rows={rows} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
          <Button 
            onClick={() => setAnalyticsDialogOpen(false)} 
            variant="contained" 
            sx={{
              bgcolor: "#6366f1",
              "&:hover": {
                bgcolor: "#4f46e5",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Achievements & Stats Dialog */}
      <Dialog
        open={achievementsDialogOpen}
        onClose={() => setAchievementsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 3,
            maxHeight: "90vh",
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          fontSize: 18,
          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
          color: "#78350f",
          borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              🏆 Achievements & Personal Records
              <Chip 
                label={accountKey.split("/")[1]} 
                size="small" 
                sx={{ 
                  bgcolor: "rgba(120, 53, 15, 0.15)", 
                  color: "#78350f",
                  fontWeight: 500,
                  fontSize: 11,
                  border: "1px solid rgba(120, 53, 15, 0.3)",
                }} 
              />
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(120, 53, 15, 0.7)" }}>
              Your trading journey
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: "background.default" }}>
          <AchievementsPage rows={rows} />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
          <Button 
            onClick={() => setAchievementsDialogOpen(false)} 
            variant="contained" 
            sx={{
              bgcolor: "#fbbf24",
              color: "#78350f",
              "&:hover": {
                bgcolor: "#f59e0b",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Dashboard Dialog */}
      <Dialog
        open={dashboardDialogOpen}
        onClose={() => setDashboardDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 3,
            maxHeight: "90vh",
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          fontSize: 18,
          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          color: "white",
          borderBottom: "1px solid rgba(139, 92, 246, 0.2)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DashboardIcon />
              Customizable Dashboard
              <Chip 
                label={accountKey.split("/")[1]} 
                size="small" 
                sx={{ 
                  bgcolor: "rgba(255, 255, 255, 0.2)", 
                  color: "white",
                  fontWeight: 500,
                  fontSize: 11,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }} 
              />
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Quick overview
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: "background.default" }}>
          <CustomDashboard rows={rows} />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
          <Button 
            onClick={() => setDashboardDialogOpen(false)} 
            variant="contained" 
            sx={{
              bgcolor: "#8b5cf6",
              "&:hover": {
                bgcolor: "#7c3aed",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Monthly Archive Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 3,
            maxHeight: "90vh",
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          fontSize: 18,
          background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
          color: "white",
          borderBottom: "1px solid rgba(127, 29, 29, 0.2)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              📅 Monthly Archive
              <Chip 
                label={accountKey.split("/")[1]} 
                size="small" 
                sx={{ 
                  bgcolor: "rgba(255, 255, 255, 0.2)", 
                  color: "white",
                  fontWeight: 500,
                  fontSize: 11,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }} 
              />
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Historical Performance
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: "background.default" }}>
          <Stack spacing={3}>
            {/* Current Month Section */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#7f1d1d", mb: 2 }}>
                📊 Current Month ({currentMonthKey})
              </Typography>
              <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">Total Trades</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{rows.length}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">Expected Risk</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: "#7f1d1d" }}>
                        {expectedRisk || "Not Set"}
                      </Typography>
                    </Box>
                    <Divider />
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                      Active trading month - data will be archived on {getMonthKey(new Date(new Date().setMonth(new Date().getMonth() + 1)))}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Previous Month Section */}
            {previousMonthData && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#991b1b", mb: 2 }}>
                  📋 Previous Month ({previousMonthData.monthKey})
                </Typography>
                <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">Total Trades</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {previousMonthData.trades.length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">Expected Risk</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#991b1b" }}>
                          {previousMonthData.expectedRisk || "Not Set"}
                        </Typography>
                      </Box>
                      <Divider />
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        Full trade data available - will be archived next month
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Archived Months Section */}
            {Object.keys(monthlySummaries).length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#7f1d1d", mb: 2 }}>
                  📦 Archived Months ({Object.keys(monthlySummaries).length})
                </Typography>
                <Stack spacing={2}>
                  {Object.entries(monthlySummaries)
                    .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)) // Sort newest first
                    .map(([monthKey, summary]) => (
                      <Card 
                        key={monthKey} 
                        sx={{ 
                          bgcolor: "background.paper", 
                          border: "1px solid", 
                          borderColor: "divider",
                          "&:hover": {
                            borderColor: "#7f1d1d",
                            boxShadow: 2,
                          }
                        }}
                      >
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: "#7f1d1d" }}>
                            {monthKey}
                          </Typography>
                          <Stack spacing={1}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">Total Trades</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{summary.totalTrades}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">Win Rate</Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600, 
                                  color: summary.winRate >= 50 ? "#15803d" : "#991b1b" 
                                }}
                              >
                                {summary.winRate}% ({summary.wins}W / {summary.losses}L)
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">Total Profit</Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600, 
                                  color: summary.totalProfit >= 0 ? "#15803d" : "#991b1b" 
                                }}
                              >
                                {summary.totalProfit >= 0 ? "+" : ""}{summary.totalProfit}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">Avg RR</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{summary.avgRR}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">Best Trade</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#15803d" }}>
                                +{summary.bestTrade}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">Worst Trade</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#991b1b" }}>
                                {summary.worstTrade}
                              </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                              Archived on {new Date(summary.createdAt).toLocaleDateString()}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                </Stack>
              </Box>
            )}

            {/* Empty State */}
            {Object.keys(monthlySummaries).length === 0 && !previousMonthData && (
              <Card sx={{ bgcolor: "background.paper", border: "1px dashed", borderColor: "divider", p: 4 }}>
                <Stack alignItems="center" spacing={2}>
                  <Typography variant="h6" color="text.secondary">📭 No Archived Data Yet</Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Your monthly summaries will appear here as months pass.
                    <br />
                    Previous month data is preserved, older months are archived as summaries.
                  </Typography>
                </Stack>
              </Card>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
          <Button 
            onClick={() => setArchiveDialogOpen(false)} 
            variant="contained" 
            sx={{
              bgcolor: "#7f1d1d",
              "&:hover": {
                bgcolor: "#991b1b",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Account Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: "#7f1d1d" }}>
          ✏️ Rename Account
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Account Name"
            fullWidth
            variant="outlined"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": {
                  borderColor: "#7f1d1d",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#7f1d1d",
                },
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Note: This will update the account name everywhere
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRenameDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              // This would need to be implemented in the parent Dashboard component
              // For now, just show an alert
              alert(`Account rename feature coming soon!\n\nThis will rename "${accountKey.split("/")[1]}" to "${newAccountName}"\n\nRequires update to account list management.`);
              setRenameDialogOpen(false);
            }}
            variant="contained"
            sx={{
              bgcolor: "#7f1d1d",
              "&:hover": { bgcolor: "#991b1b" }
            }}
            disabled={!newAccountName.trim() || newAccountName === accountKey.split("/")[1]}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
