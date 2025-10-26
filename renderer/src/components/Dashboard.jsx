import React, { useState } from "react";
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
} from "@mui/material";
import {
  AccountBalance as FundedIcon,
  Person as OwnIcon,
  TrendingUp as TrendingIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import AccountList from "./AccountList";
import AccountPage from "./AccountPage";
import schema from "../shared/schema.json";

export default function Dashboard() {
  const [section, setSection] = useState("Funded Accounts");
  const [activeAccount, setActiveAccount] = useState(null);
  const [fundedAccounts, setFundedAccounts] = useState(["GOLD1", "GOLD2", "SILVER/US30", "BTCUSD/US30", "GBPJPY"]);
  const [ownAccounts, setOwnAccounts] = useState(["GOLD1", "GOLD2", "SILVER/US30", "GBPJPY"]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  
  const accounts = section === "Funded Accounts" ? fundedAccounts : ownAccounts;
  
  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      if (section === "Funded Accounts") {
        setFundedAccounts([...fundedAccounts, newAccountName.trim()]);
      } else {
        setOwnAccounts([...ownAccounts, newAccountName.trim()]);
      }
      setNewAccountName("");
      setOpenDialog(false);
    }
  };
  
  const handleDeleteAccount = (accountName) => {
    if (section === "Funded Accounts") {
      setFundedAccounts(fundedAccounts.filter(acc => acc !== accountName));
    } else {
      setOwnAccounts(ownAccounts.filter(acc => acc !== accountName));
    }
    // Close the account if it's currently open
    if (activeAccount === accountName) {
      setActiveAccount(null);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Modern AppBar with gradient */}
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <TrendingIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Performance Tracker Pro
          </Typography>
          <Chip
            label="Live"
            color="success"
            size="small"
            sx={{
              fontWeight: 600,
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.7 },
              },
            }}
          />
        </Toolbar>
      </AppBar>

      {/* Enhanced Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 280,
            boxSizing: "border-box",
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
              <FundedIcon sx={{ mr: 2, color: "primary.main" }} />
              <ListItemText
                primary="Funded Accounts"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Chip
                label={fundedAccounts.length}
                size="small"
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  height: 24,
                  fontWeight: 700,
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
              <OwnIcon sx={{ mr: 2, color: "secondary.main" }} />
              <ListItemText
                primary="Own Accounts"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Chip
                label={ownAccounts.length}
                size="small"
                sx={{
                  bgcolor: "secondary.main",
                  color: "white",
                  height: 24,
                  fontWeight: 700,
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
                bgcolor: "primary.main",
                color: "white",
                width: 24,
                height: 24,
                "&:hover": {
                  bgcolor: "primary.dark",
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
          ml: "280px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          minHeight: "100vh",
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
              sx={{ fontSize: 120, color: "primary.main", opacity: 0.3, mb: 3 }}
            />
            <Typography variant="h4" sx={{ mb: 2, color: "text.primary" }}>
              Welcome to Performance Tracker Pro
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Select an account from the sidebar to view and manage your trades
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add Account Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 2,
            minWidth: 400,
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
            onChange={(e) => setNewAccountName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddAccount();
              }
            }}
            placeholder="e.g., EURUSD, GOLD3, etc."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleAddAccount} 
            variant="contained" 
            color="primary"
            disabled={!newAccountName.trim()}
          >
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
