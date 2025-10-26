import React from "react";
import {
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Box,
  Chip,
  IconButton,
} from "@mui/material";
import {
  ShowChart as ChartIcon,
  KeyboardArrowRight as ArrowIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";

export default function AccountList({ accounts, onOpen, activeAccount, onDelete }) {
  return (
    <List sx={{ mt: 1 }}>
      {accounts.map((account, index) => (
        <motion.div
          key={account}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <ListItemButton
            selected={activeAccount === account}
            onClick={() => onOpen(account)}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              border: activeAccount === account 
                ? "1px solid rgba(99, 102, 241, 0.5)" 
                : "1px solid transparent",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateX(4px)",
                borderColor: "rgba(99, 102, 241, 0.3)",
              },
              "&.Mui-selected": {
                bgcolor: "rgba(99, 102, 241, 0.15)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: activeAccount === account 
                    ? "primary.main" 
                    : "rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <ChartIcon
                  sx={{
                    fontSize: 18,
                    color: activeAccount === account ? "white" : "primary.light",
                  }}
                />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={account}
              primaryTypographyProps={{
                fontWeight: activeAccount === account ? 700 : 500,
                fontSize: 14,
              }}
            />
            {activeAccount === account ? (
              <ArrowIcon
                sx={{
                  color: "primary.main",
                  fontSize: 20,
                }}
              />
            ) : (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete account "${account}"? This cannot be undone.`)) {
                    onDelete(account);
                  }
                }}
                sx={{
                  opacity: 0,
                  transition: "opacity 0.2s",
                  ".MuiListItemButton-root:hover &": {
                    opacity: 1,
                  },
                  color: "error.main",
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </ListItemButton>
        </motion.div>
      ))}
    </List>
  );
}
