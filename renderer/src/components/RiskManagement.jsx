import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Calculate } from "@mui/icons-material";

export default function RiskManagement({ 
  accountName, 
  accountType,
  riskSettings, 
  onSettingsChange,
}) {
  const [initialCapital, setInitialCapital] = useState(riskSettings?.initialCapital || 200);
  const [currentCapital, setCurrentCapital] = useState(riskSettings?.currentCapital || 200);
  const [baseTrades, setBaseTrades] = useState(riskSettings?.baseTrades || 6);

  // Sync with parent's riskSettings when it changes (from P/L auto-calculation)
  useEffect(() => {
    if (riskSettings?.currentCapital !== undefined && riskSettings.currentCapital !== currentCapital) {
      setCurrentCapital(riskSettings.currentCapital);
    }
  }, [riskSettings?.currentCapital]);

  useEffect(() => {
    if (riskSettings?.initialCapital !== undefined && riskSettings.initialCapital !== initialCapital) {
      setInitialCapital(riskSettings.initialCapital);
    }
  }, [riskSettings?.initialCapital]);

  useEffect(() => {
    if (riskSettings?.baseTrades !== undefined && riskSettings.baseTrades !== baseTrades) {
      setBaseTrades(riskSettings.baseTrades);
    }
  }, [riskSettings?.baseTrades]);

  // Calculate milestone capital and trades automatically
  const calculateMilestoneAndTrades = () => {
    if (initialCapital <= 0 || baseTrades <= 0 || currentCapital <= 0) {
      return { milestoneCapital: initialCapital, tradesAtMilestone: baseTrades };
    }

    // Use INITIAL CAPITAL as the base reference point
    const baseReference = initialCapital;
    
    // Find which milestone level we've reached (50% increments)
    // milestoneLevel 0 = $200 (initial, 1.0x)
    // milestoneLevel 1 = $300 (initial + 50%, 1.5x)
    // milestoneLevel 2 = $400 (initial + 100%, 2.0x)
    // milestoneLevel 3 = $500 (initial + 150%, 2.5x)
    let milestoneLevel = 0;
    
    // Keep increasing milestone level while we're at or above the next 50% threshold
    // Each milestone is at baseReference * (1 + 0.5 * (level + 1))
    while (currentCapital >= baseReference * (1 + 0.5 * (milestoneLevel + 1))) {
      milestoneLevel++;
    }
    
    // Calculate trades: base + (2 trades per milestone level)
    // If current < 1.5x initial, milestoneLevel = 0, so trades = baseTrades
    // If current >= 1.5x initial, milestoneLevel = 1, so trades = baseTrades + 2
    const additionalTrades = milestoneLevel * 2;
    const currentTrades = baseTrades + additionalTrades;
    
    // Current milestone is at the level we're at
    const currentMilestone = baseReference * (1 + 0.5 * milestoneLevel);

    return {
      milestoneCapital: currentMilestone,
      tradesAtMilestone: currentTrades,
    };
  };

  const { milestoneCapital, tradesAtMilestone } = calculateMilestoneAndTrades();
  
  // Calculate Risk Per Trade
  // If current capital is below initial, use the initial risk (don't decrease)
  // If current capital is at or above initial, calculate normally
  const baseRisk = initialCapital / baseTrades;
  const riskPerTrade = currentCapital < initialCapital 
    ? baseRisk 
    : (tradesAtMilestone > 0 ? currentCapital / tradesAtMilestone : 0);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange({
        initialCapital,
        currentCapital,
        baseTrades,
        milestoneCapital,
        tradesAtMilestone,
        riskPerTrade,
      });
    }
  }, [initialCapital, currentCapital, baseTrades, milestoneCapital, tradesAtMilestone, riskPerTrade]);

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Header */}
      <Box sx={{ mb: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(127, 29, 29, 0.25)",
          }}
        >
          <Calculate sx={{ fontSize: 20, color: "#ffffff" }} />
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            color: "#1f2937",
            letterSpacing: "-0.02em",
            fontSize: "1.125rem",
          }}
        >
          Risk Management Calculator
      </Typography>
      </Box>

      {/* Main Calculator Card */}
      <Card 
        elevation={0}
        sx={{ 
          maxWidth: 720, 
          mx: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
        }}
      >
        <TableContainer>
          <Table size="small">
            {/* Header Section */}
            <TableHead>
              <TableRow>
                <TableCell 
                  colSpan={3}
                  sx={{ 
                    background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
                    color: "#ffffff", 
                    fontWeight: 700, 
                    fontSize: "0.8125rem",
                    textAlign: "center",
                    py: 1.5,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    borderBottom: "none",
                    boxShadow: "inset 0 -1px 0 rgba(255, 255, 255, 0.1)",
                  }}
                >
                  FUNDED CAPITAL RISK BY DAILY LOSE LIMIT ({accountName || "G1/US30"})
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell 
                  sx={{ 
                    background: "linear-gradient(180deg, #374151 0%, #1f2937 100%)",
                    color: "#ffffff", 
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textAlign: "center",
                    py: 1.25,
                    width: "50%",
                    letterSpacing: "0.5px",
                    borderBottom: "2px solid #e5e7eb",
                    borderRight: "1px solid #4b5563",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                  }}
                  colSpan={2}
                >
                  KEY COMPONENTS
                </TableCell>
                <TableCell 
                  sx={{ 
                    background: "linear-gradient(180deg, #374151 0%, #1f2937 100%)",
                    color: "#ffffff", 
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textAlign: "center",
                    py: 1.25,
                    width: "50%",
                    letterSpacing: "0.5px",
                    borderBottom: "2px solid #e5e7eb",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                  }}
                >
                  CALCULATIONS
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Initial Capital Row */}
              <TableRow>
                <TableCell 
                  rowSpan={6}
                  sx={{ 
                    background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                    color: "#ffffff", 
                    fontWeight: 900,
                    fontSize: "2rem",
                    textAlign: "center",
                    verticalAlign: "middle",
                    width: 60,
                    borderRight: "2px solid #e5e7eb",
                    fontFamily: "Inter, sans-serif",
                    boxShadow: "inset 0 1px 3px rgba(255, 255, 255, 0.2), 2px 0 6px rgba(21, 128, 61, 0.15)",
                  }}
                >
                  1
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 600, 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#fafafa",
                    color: "#1f2937",
                    fontSize: "0.8125rem",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  Initial Capital (Daily lose limit)
                </TableCell>
                <TableCell 
                  sx={{ 
                    textAlign: "center", 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#ffffff",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <TextField
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    variant="standard"
                    InputProps={{
                      disableUnderline: false,
                      sx: {
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#1f2937",
                      }
                    }}
                    sx={{ 
                      width: 110,
                      "& input": { 
                        textAlign: "center",
                        padding: "2px 0",
                      },
                      "& .MuiInput-underline:before": {
                        borderBottomColor: "#e5e7eb",
                      },
                      "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                        borderBottomColor: "#7f1d1d",
                        borderBottomWidth: "2px",
                      },
                      "& .MuiInput-underline:after": {
                        borderBottomColor: "#7f1d1d",
                        borderBottomWidth: "2px",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>

              {/* Current Capital Row */}
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 600, 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#fafafa",
                    color: "#1f2937",
                    fontSize: "0.8125rem",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <Box>
                    Current Capital (Auto-calculated)
                    <Typography variant="caption" display="block" sx={{ color: "#6b7280", fontSize: "0.7rem", mt: 0.25 }}>
                      Updates from P/L • Editable for commissions
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell 
                  sx={{ 
                    textAlign: "center", 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#ffffff",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <TextField
                    type="number"
                    value={currentCapital}
                    onChange={(e) => setCurrentCapital(Number(e.target.value))}
                    variant="standard"
                    InputProps={{
                      disableUnderline: false,
                      sx: {
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#1f2937",
                      }
                    }}
                    sx={{ 
                      width: 110,
                      "& input": { 
                        textAlign: "center",
                        padding: "2px 0",
                      },
                      "& .MuiInput-underline:before": {
                        borderBottomColor: "#e5e7eb",
                      },
                      "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                        borderBottomColor: "#7f1d1d",
                        borderBottomWidth: "2px",
                      },
                      "& .MuiInput-underline:after": {
                        borderBottomColor: "#7f1d1d",
                        borderBottomWidth: "2px",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>

              {/* Base Trades Row */}
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 600, 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#fafafa",
                    color: "#1f2937",
                    fontSize: "0.8125rem",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  Base Trades (Start)
                </TableCell>
                <TableCell 
                  sx={{ 
                    textAlign: "center", 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#ffffff",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                <TextField
                  type="number"
                    value={baseTrades}
                    onChange={(e) => setBaseTrades(Number(e.target.value))}
                    variant="standard"
                    InputProps={{
                      disableUnderline: false,
                      sx: {
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#1f2937",
                      }
                    }}
                    sx={{ 
                      width: 110,
                      "& input": { 
                        textAlign: "center",
                        padding: "2px 0",
                      },
                      "& .MuiInput-underline:before": {
                        borderBottomColor: "#e5e7eb",
                      },
                      "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                        borderBottomColor: "#7f1d1d",
                        borderBottomWidth: "2px",
                      },
                      "& .MuiInput-underline:after": {
                        borderBottomColor: "#7f1d1d",
                        borderBottomWidth: "2px",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>

              {/* Milestone Capital Row - Auto Calculated */}
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 600, 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#fafafa",
                    color: "#1f2937",
                    fontSize: "0.8125rem",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  Milestone Capital
                </TableCell>
                <TableCell 
                  sx={{ 
                    textAlign: "center", 
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    py: 1.25,
                    px: 2.5,
                    background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                    color: "#92400e",
                    borderBottom: "1px solid #fde68a",
                    boxShadow: "inset 0 1px 2px rgba(251, 191, 36, 0.1)",
                  }}
                >
                  {milestoneCapital.toFixed(2)}
                </TableCell>
              </TableRow>

              {/* Trades at Milestone Row - Auto Calculated */}
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 600, 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#fafafa",
                    color: "#1f2937",
                    fontSize: "0.8125rem",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  Trades at Milestone
                </TableCell>
                <TableCell 
                  sx={{ 
                    textAlign: "center", 
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    py: 1.25,
                    px: 2.5,
                    background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                    color: "#92400e",
                    borderBottom: "1px solid #fde68a",
                    boxShadow: "inset 0 1px 2px rgba(251, 191, 36, 0.1)",
                  }}
                >
                  {tradesAtMilestone}
                </TableCell>
              </TableRow>

              {/* Risk Per Trade Row - Final Calculation */}
                      <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 600, 
                    py: 1.25,
                    px: 2.5,
                    bgcolor: "#fafafa",
                    color: "#1f2937",
                    fontSize: "0.8125rem",
                    borderRight: "1px solid #e5e7eb",
                  }}
                >
                  Risk Per Trade
                          </TableCell>
                <TableCell 
                  sx={{ 
                    textAlign: "center", 
                    fontWeight: 800,
                    fontSize: "0.9375rem",
                    py: 1.5,
                    px: 2.5,
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    color: "#15803d",
                    letterSpacing: "0.3px",
                    boxShadow: "inset 0 1px 3px rgba(34, 197, 94, 0.15)",
                    borderTop: "2px solid #bbf7d0",
                  }}
                >
                  {riskPerTrade.toFixed(8)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
            </Card>

      {/* Helper Information Card */}
      <Card 
        elevation={0}
        sx={{ 
          mt: 2, 
          maxWidth: 720,
          mx: "auto",
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: "1px solid #bfdbfe",
          borderRadius: 1.5,
          boxShadow: "0 1px 2px rgba(59, 130, 246, 0.1)",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 700, 
              mb: 1.25,
              color: "#1e40af",
              fontSize: "0.75rem",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            📊 How It Works
              </Typography>
          
          <Box sx={{ display: "grid", gap: 0.75 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#1f2937",
                fontSize: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              • <strong>Start:</strong> Set Initial Capital and Base Trades
              </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#15803d",
                fontSize: "0.75rem",
                lineHeight: 1.5,
                fontWeight: 600,
              }}
            >
              • <strong>Auto-Update:</strong> Current Capital = Initial + Total P/L from trades
                  </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#1f2937",
                fontSize: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              • <strong>Manual Adjust:</strong> Edit Current Capital for broker commissions ($2-$10)
                  </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#1f2937",
                fontSize: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              • <strong>Reach Milestone:</strong> Every 50% gain (+$100), trades increase by +2
                  </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#ef4444",
                fontSize: "0.75rem",
                lineHeight: 1.5,
                fontWeight: 600,
              }}
            >
              • <strong>Below Initial:</strong> Risk stays constant at initial level (protects from over-risking)
                  </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#1f2937",
                fontSize: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              • <strong>At Milestone:</strong> When back at initial, trades return to base level
                  </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#1f2937",
                fontSize: "0.75rem",
                lineHeight: 1.5,
                fontWeight: 600,
              }}
            >
              • <strong>Risk Formula:</strong> Current Capital ÷ Active Trades = Risk Per Trade
                  </Typography>
          </Box>
        </Box>
          </Card>
    </Box>
  );
}
