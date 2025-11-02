import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import {
  AccountBalance as FundedIcon,
  Person as OwnIcon,
  TrendingUp as TrendingIcon,
  Add as AddIcon,
  FormatBold as FormatBoldIcon,
  FormatSize as FormatSizeIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import AccountList from "./AccountList";
import AccountPage from "./AccountPage";
import schema from "../shared/schema.json";
import { db } from "../App";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export default function Dashboard() {
  const [section, setSection] = useState("Funded Accounts");
  const [activeAccount, setActiveAccount] = useState(null);
  const [fundedAccounts, setFundedAccounts] = useState([]);
  const [ownAccounts, setOwnAccounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [accountReason, setAccountReason] = useState("");
  const [multiInstrumentReason, setMultiInstrumentReason] = useState("");
  const [showMultiInstrumentReason, setShowMultiInstrumentReason] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar visibility state
  
  // Formatting states for account reason
  const [accountReasonBold, setAccountReasonBold] = useState(false);
  const [accountReasonSize, setAccountReasonSize] = useState(13);
  const [multiReasonBold, setMultiReasonBold] = useState(false);
  const [multiReasonSize, setMultiReasonSize] = useState(13);
  
  // Load account lists from Firebase on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setError(null);
        const accountListsRef = doc(db, "accountLists", "lists");
        const snap = await getDoc(accountListsRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setFundedAccounts(data.fundedAccounts || []);
          setOwnAccounts(data.ownAccounts || []);
          console.log("✓ Account lists loaded from Firebase");
        } else {
          // Initialize with default accounts if no data exists
          const defaultFunded = ["GOLD1", "GOLD2", "GBPJPY"];
          const defaultOwn = ["GOLD1", "GOLD2", "GBPJPY"];
          setFundedAccounts(defaultFunded);
          setOwnAccounts(defaultOwn);
          // Save defaults to Firebase
          await setDoc(accountListsRef, {
            fundedAccounts: defaultFunded,
            ownAccounts: defaultOwn
          });
          console.log("✓ Default account lists created in Firebase");
        }
      } catch (error) {
        console.error("Error loading account lists:", error);
        setError(error.message);
        // Set default accounts even if Firebase fails
        setFundedAccounts(["GOLD1", "GOLD2", "GBPJPY"]);
        setOwnAccounts(["GOLD1", "GOLD2", "GBPJPY"]);
      } finally {
        setLoading(false);
      }
    };
    
    loadAccounts();
  }, []);
  
  // Save account lists to Firebase whenever they change
  useEffect(() => {
    if (!loading && fundedAccounts.length > 0) {
      const saveAccounts = async () => {
        try {
          const accountListsRef = doc(db, "accountLists", "lists");
          await setDoc(accountListsRef, {
            fundedAccounts,
            ownAccounts
          });
          console.log("✓ Account lists saved to Firebase");
        } catch (error) {
          console.error("Error saving account lists:", error);
          // Don't block UI if save fails
        }
      };
      
      saveAccounts();
    }
  }, [fundedAccounts, ownAccounts, loading]);
  
  const accounts = section === "Funded Accounts" ? fundedAccounts : ownAccounts;
  
  // Detect if account name has multiple instruments (separated by /)
  const detectMultipleInstruments = (accountName) => {
    const parts = accountName.split("/").filter(p => p.trim());
    return parts.length > 1;
  };

  // Format text with HTML tags
  const formatText = (text, bold, size) => {
    if (!text) return "";
    let formatted = text;
    if (bold) {
      formatted = `<strong>${formatted}</strong>`;
    }
    return `<span style="font-size: ${size}px;">${formatted}</span>`;
  };

  const handleAddAccount = async () => {
    const trimmedName = newAccountName.trim();
    if (!trimmedName) return;
    
    // Check if account has multiple instruments
    const hasMultipleInstruments = detectMultipleInstruments(trimmedName);
    
    // If multiple instruments but no reason provided, show second dialog
    if (hasMultipleInstruments && !multiInstrumentReason.trim()) {
      setShowMultiInstrumentReason(true);
      return;
    }
    
    // Validate single instrument reason is provided
    if (!accountReason.trim()) {
      alert("Please provide a reason for trading this instrument.");
      return;
    }

    // Add account to list
    if (section === "Funded Accounts") {
      setFundedAccounts([...fundedAccounts, trimmedName]);
    } else {
      setOwnAccounts([...ownAccounts, trimmedName]);
    }

    // Store account reasons with formatting in Firebase
    const accountKey = `${section}/${trimmedName}`;
    const accountData = {
      accountReason: formatText(accountReason.trim(), accountReasonBold, accountReasonSize),
      accountReasonPlain: accountReason.trim(), // Store plain text too for editing
      accountReasonFormat: { bold: accountReasonBold, size: accountReasonSize },
      multiInstrumentReason: hasMultipleInstruments ? formatText(multiInstrumentReason.trim(), multiReasonBold, multiReasonSize) : null,
      multiInstrumentReasonPlain: hasMultipleInstruments ? multiInstrumentReason.trim() : null,
      multiInstrumentReasonFormat: hasMultipleInstruments ? { bold: multiReasonBold, size: multiReasonSize } : null,
      createdAt: new Date().toISOString()
    };

    try {
      const accountRef = doc(db, "accounts", encodeURIComponent(accountKey));
      await setDoc(accountRef, accountData, { merge: true });
      console.log("✓ Account reasons saved to Firebase");
    } catch (error) {
      console.warn("Failed to save account reasons:", error);
    }

    // Reset form
    setNewAccountName("");
    setAccountReason("");
    setMultiInstrumentReason("");
    setAccountReasonBold(false);
    setAccountReasonSize(13);
    setMultiReasonBold(false);
    setMultiReasonSize(13);
    setShowMultiInstrumentReason(false);
    setOpenDialog(false);
  };
  
  // Helper function to generate local file name (same as in AccountPage)
  const localFileName = (key) => {
    return `account_${key.replace(/[\\/: ]/g, "_")}.json`;
  };

  const handleDeleteAccount = async (accountName) => {
    const accountKey = `${section}/${accountName}`;
    let deletionErrors = [];
    
    // 1. Delete from the account list (immediate UI update)
    if (section === "Funded Accounts") {
      setFundedAccounts(fundedAccounts.filter(acc => acc !== accountName));
    } else {
      setOwnAccounts(ownAccounts.filter(acc => acc !== accountName));
    }
    
    // 2. Close the account if it's currently open
    if (activeAccount === accountName) {
      setActiveAccount(null);
    }
    
    // 3. Delete from local storage (Electron or Browser)
    try {
      if (window?.electronAPI?.readLocalFile) {
        // Electron: File deletion would require additional IPC
        // For now, local file will remain but won't be loaded (account removed from list)
        console.log(`Note: Local Electron file for ${accountKey} may remain but won't be accessible`);
      } else {
        // Browser localStorage: Delete the key
        const storageKey = `account_${accountKey}`;
        localStorage.removeItem(storageKey);
        console.log(`✓ Deleted from localStorage: ${storageKey}`);
      }
    } catch (error) {
      console.warn("Failed to delete from local storage:", error.message);
      deletionErrors.push("local storage");
    }
    
    // 4. Delete from Firebase (don't block on this - account is already removed from UI)
    try {
      const docRef = doc(db, "accounts", encodeURIComponent(accountKey));
      await deleteDoc(docRef);
      console.log(`✓ Deleted account document from Firebase: ${accountKey}`);
    } catch (error) {
      console.warn("Failed to delete account document from Firebase:", error.message);
      deletionErrors.push("Firebase");
      
      // Show user-friendly error message if Firebase deletion fails
      if (error.code === 'permission-denied') {
        console.warn("Firebase permission denied - check Firestore rules");
      }
    }
    
    // 5. Show success message (account removed from list regardless of storage deletion)
    if (deletionErrors.length > 0) {
      console.warn(`Account removed from list, but some deletions failed: ${deletionErrors.join(", ")}`);
    }
  };

  const handleRenameAccount = async (oldAccountName, newAccountName) => {
    if (!newAccountName.trim() || newAccountName.trim() === oldAccountName) {
      return false; // No change or empty name
    }

    const trimmedNewName = newAccountName.trim();
    
    try {
      const oldAccountKey = `${section}/${oldAccountName}`;
      const newAccountKey = `${section}/${trimmedNewName}`;
      
      // 1. Get the old account data from Firebase
      const oldDocRef = doc(db, "accounts", encodeURIComponent(oldAccountKey));
      const oldDocSnap = await getDoc(oldDocRef);
      
      // 2. Calculate updated account lists
      let updatedFundedAccounts = fundedAccounts;
      let updatedOwnAccounts = ownAccounts;
      
      if (section === "Funded Accounts") {
        updatedFundedAccounts = fundedAccounts.map(acc => acc === oldAccountName ? trimmedNewName : acc);
      } else {
        updatedOwnAccounts = ownAccounts.map(acc => acc === oldAccountName ? trimmedNewName : acc);
      }
      
      // 3. Update account list in state
      if (section === "Funded Accounts") {
        setFundedAccounts(updatedFundedAccounts);
      } else {
        setOwnAccounts(updatedOwnAccounts);
      }
      
      // 4. Update activeAccount if it's the renamed account
      if (activeAccount === oldAccountName) {
        setActiveAccount(trimmedNewName);
      }
      
      // 5. If old document exists, create new document with new name and delete old one
      if (oldDocSnap.exists()) {
        const accountData = oldDocSnap.data();
        const newDocRef = doc(db, "accounts", encodeURIComponent(newAccountKey));
        
        // Save data to new document
        await setDoc(newDocRef, accountData);
        console.log(`✓ Created new account document: ${newAccountKey}`);
        
        // Delete old document
        await deleteDoc(oldDocRef);
        console.log(`✓ Deleted old account document: ${oldAccountKey}`);
      }
      
      // 6. Update account lists in Firebase
      const accountListsRef = doc(db, "accountLists", "lists");
      await setDoc(accountListsRef, {
        fundedAccounts: updatedFundedAccounts,
        ownAccounts: updatedOwnAccounts
      }, { merge: true });
      
      console.log(`✓ Account renamed from "${oldAccountName}" to "${trimmedNewName}"`);
      return true;
    } catch (error) {
      console.error("Failed to rename account:", error);
      alert(`Failed to rename account: ${error.message}`);
      return false;
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Professional AppBar */}
      <AppBar position="fixed" sx={{ zIndex: 1201, ml: sidebarOpen ? "280px" : 0, width: sidebarOpen ? "calc(100% - 280px)" : "100%", transition: "all 0.3s ease" }}>
        <Toolbar>
          <IconButton
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ mr: 2, color: "#1f2937" }}
            size="small"
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <TrendingIcon sx={{ mr: 2, fontSize: 28, color: "#7f1d1d" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1, letterSpacing: "-0.01em", color: "#1f2937" }}>
            Performance Tracker
          </Typography>
          <Chip
            label="LIVE"
            size="small"
            sx={{
              fontWeight: 600,
              bgcolor: "rgba(21, 128, 61, 0.1)",
              color: "#15803d",
              border: "1px solid rgba(21, 128, 61, 0.2)",
              fontSize: 11,
              height: 24,
            }}
          />
        </Toolbar>
      </AppBar>

      {/* Enhanced Sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? 280 : 0,
          flexShrink: 0,
          transition: "width 0.3s ease",
          [`& .MuiDrawer-paper`]: {
            width: 280,
            boxSizing: "border-box",
            transition: "width 0.3s ease",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: 2, py: 3 }}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              letterSpacing: 1.2,
              fontSize: 11,
            }}
          >
            Account Categories
          </Typography>
          <List sx={{ mt: 1 }}>
            <ListItemButton
              selected={section === "Funded Accounts"}
              onClick={() => {
                setSection("Funded Accounts");
                setActiveAccount(null);
              }}
              sx={{ mb: 1 }}
            >
              <FundedIcon sx={{ mr: 2, color: "#6b7280", fontSize: 20 }} />
              <ListItemText
                primary="Funded Accounts"
                primaryTypographyProps={{ fontWeight: 500, fontSize: 14, color: "#1f2937" }}
              />
              <Chip
                label={fundedAccounts.length}
                size="small"
                sx={{
                  bgcolor: "rgba(127, 29, 29, 0.1)",
                  color: "#7f1d1d",
                  height: 22,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              />
            </ListItemButton>
            <ListItemButton
              selected={section === "Own Accounts"}
              onClick={() => {
                setSection("Own Accounts");
                setActiveAccount(null);
              }}
            >
              <OwnIcon sx={{ mr: 2, color: "#6b7280", fontSize: 20 }} />
              <ListItemText
                primary="Own Accounts"
                primaryTypographyProps={{ fontWeight: 500, fontSize: 14, color: "#1f2937" }}
              />
              <Chip
                label={ownAccounts.length}
                size="small"
                sx={{
                  bgcolor: "rgba(127, 29, 29, 0.1)",
                  color: "#7f1d1d",
                  height: 22,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              />
            </ListItemButton>
          </List>

          <Divider sx={{ my: 3, borderColor: "rgba(148, 163, 184, 0.2)" }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: 1.2,
                fontSize: 11,
              }}
            >
              {section}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOpenDialog(true)}
              sx={{
                bgcolor: "rgba(127, 29, 29, 0.1)",
                color: "#7f1d1d",
                width: 24,
                height: 24,
                "&:hover": {
                  bgcolor: "rgba(127, 29, 29, 0.15)",
                },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
          <AccountList
            accounts={accounts}
            onOpen={setActiveAccount}
            activeAccount={activeAccount}
            onDelete={handleDeleteAccount}
          />
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 1,
          ml: sidebarOpen ? "280px" : 0,
          background: "#ffffff",
          minHeight: "100vh",
          transition: "margin-left 0.3s ease",
          width: sidebarOpen ? "calc(100% - 280px)" : "100%",
        }}
      >
        <Toolbar sx={{ minHeight: "48px !important" }} />
        {activeAccount ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <AccountPage
              accountKey={`${section}/${activeAccount}`}
              columns={schema.columns}
              onRenameAccount={handleRenameAccount}
            />
          </motion.div>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
            }}
          >
            <TrendingIcon
              sx={{ fontSize: 80, color: "#7f1d1d", opacity: 0.15, mb: 3 }}
            />
            <Typography variant="h5" sx={{ mb: 1, color: "#1f2937", fontWeight: 500 }}>
              Welcome to Performance Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              Select an account from the sidebar to view and manage your trades
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add Account Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setNewAccountName("");
          setAccountReason("");
          setMultiInstrumentReason("");
          setAccountReasonBold(false);
          setAccountReasonSize(13);
          setMultiReasonBold(false);
          setMultiReasonSize(13);
          setShowMultiInstrumentReason(false);
        }}
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 2,
            minWidth: 450,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add New Account to {section}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Account Name"
            fullWidth
            variant="outlined"
            value={newAccountName}
            onChange={(e) => {
              setNewAccountName(e.target.value);
              // Auto-detect multiple instruments
              const hasMultiple = detectMultipleInstruments(e.target.value);
              setShowMultiInstrumentReason(hasMultiple && e.target.value.trim() !== "");
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !showMultiInstrumentReason) {
                handleAddAccount();
              }
            }}
            placeholder="e.g., EURUSD, GOLD3, or GBPJPY/EURUSD for multiple"
            helperText={detectMultipleInstruments(newAccountName) ? "Multiple instruments detected - you'll be asked why you're trading them together" : ""}
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>
                Why are you trading this instrument?
              </Typography>
              <IconButton
                size="small"
                onClick={() => setAccountReasonBold(!accountReasonBold)}
                sx={{
                  bgcolor: accountReasonBold ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  color: accountReasonBold ? "#6366f1" : "text.secondary",
                }}
                title="Bold"
              >
                <FormatBoldIcon fontSize="small" />
              </IconButton>
              <Select
                size="small"
                value={accountReasonSize}
                onChange={(e) => setAccountReasonSize(e.target.value)}
                sx={{ minWidth: 70, height: 32 }}
              >
                <MenuItem value={11}>11px</MenuItem>
                <MenuItem value={12}>12px</MenuItem>
                <MenuItem value={13}>13px</MenuItem>
                <MenuItem value={14}>14px</MenuItem>
                <MenuItem value={15}>15px</MenuItem>
                <MenuItem value={16}>16px</MenuItem>
              </Select>
            </Box>
            <TextField
              margin="dense"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={accountReason}
              onChange={(e) => setAccountReason(e.target.value)}
              placeholder="e.g., Strong trend, Good volatility, News event, etc."
              required
            />
          </Box>
          {showMultiInstrumentReason && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>
                  Why are you trading multiple instruments in one account?
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setMultiReasonBold(!multiReasonBold)}
                  sx={{
                    bgcolor: multiReasonBold ? "rgba(99, 102, 241, 0.1)" : "transparent",
                    color: multiReasonBold ? "#6366f1" : "text.secondary",
                  }}
                  title="Bold"
                >
                  <FormatBoldIcon fontSize="small" />
                </IconButton>
                <Select
                  size="small"
                  value={multiReasonSize}
                  onChange={(e) => setMultiReasonSize(e.target.value)}
                  sx={{ minWidth: 70, height: 32 }}
                >
                  <MenuItem value={11}>11px</MenuItem>
                  <MenuItem value={12}>12px</MenuItem>
                  <MenuItem value={13}>13px</MenuItem>
                  <MenuItem value={14}>14px</MenuItem>
                  <MenuItem value={15}>15px</MenuItem>
                  <MenuItem value={16}>16px</MenuItem>
                </Select>
              </Box>
              <TextField
                margin="dense"
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={multiInstrumentReason}
                onChange={(e) => setMultiInstrumentReason(e.target.value)}
                placeholder="e.g., Diversification, Related pairs, Different timeframes, etc."
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setNewAccountName("");
              setAccountReason("");
              setMultiInstrumentReason("");
              setAccountReasonBold(false);
              setAccountReasonSize(13);
              setMultiReasonBold(false);
              setMultiReasonSize(13);
              setShowMultiInstrumentReason(false);
            }} 
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddAccount} 
            variant="contained" 
            color="primary"
            disabled={!newAccountName.trim() || !accountReason.trim() || (showMultiInstrumentReason && !multiInstrumentReason.trim())}
          >
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
