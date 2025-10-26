import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  LinearProgress,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export default function AccountComparison({ allAccounts }) {
  const accountStats = useMemo(() => {
    if (!allAccounts || allAccounts.length === 0) {
      return [];
    }

    return allAccounts.map(account => {
      const rows = account.rows || [];
      const validTrades = rows.filter(row => {
        const plValue = parseFloat(row["P/L"]);
        return !isNaN(plValue);
      });

      const wins = validTrades.filter(r => parseFloat(r["P/L"]) > 0);
      const losses = validTrades.filter(r => parseFloat(r["P/L"]) < 0);
      
      const totalProfit = validTrades.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0);
      const winRate = validTrades.length > 0 ? (wins.length / validTrades.length) * 100 : 0;
      
      const avgWin = wins.length > 0 ? wins.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / losses.length) : 0;
      const profitFactor = avgLoss > 0 ? (wins.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0)) / Math.abs(losses.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0)) : 0;

      return {
        name: account.accountKey.split("/")[1] || account.accountKey,
        totalTrades: validTrades.length,
        wins: wins.length,
        losses: losses.length,
        winRate,
        totalProfit,
        avgWin,
        avgLoss,
        profitFactor,
      };
    }).filter(stats => stats.totalTrades > 0);
  }, [allAccounts]);

  // Prepare data for charts
  const comparisonData = accountStats.map(stats => ({
    name: stats.name.length > 15 ? stats.name.substring(0, 12) + "..." : stats.name,
    "Win Rate": parseFloat(stats.winRate.toFixed(1)),
    "Total P/L": parseFloat(stats.totalProfit.toFixed(2)),
    "Profit Factor": parseFloat(stats.profitFactor.toFixed(2)),
  }));

  const radarData = accountStats.map(stats => ({
    account: stats.name.length > 10 ? stats.name.substring(0, 8) + "..." : stats.name,
    "Win Rate": parseFloat(stats.winRate.toFixed(0)),
    "Trades": Math.min(stats.totalTrades, 100), // Normalize to 100 max
    "Profit": stats.totalProfit > 0 ? Math.min((stats.totalProfit / 1000) * 100, 100) : 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: "rgba(0, 0, 0, 0.9)",
            p: 1.5,
            borderRadius: 1,
            border: "1px solid #374151",
          }}
        >
          <Typography variant="body2" sx={{ color: "white", fontWeight: 600, mb: 0.5 }}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="caption"
              sx={{ color: entry.color, display: "block" }}
            >
              {entry.name}: {entry.name === "Total P/L" ? `$${entry.value}` : 
                             entry.name === "Win Rate" ? `${entry.value}%` :
                             entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (accountStats.length === 0) {
    return (
      <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            📊 Account Comparison
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No accounts with trades available for comparison yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const bestAccount = accountStats.reduce((best, current) => 
    current.totalProfit > best.totalProfit ? current : best
  );

  const bestWinRate = accountStats.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  );

  return (
    <Box>
      {/* Summary Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1, bgcolor: "#f0fdf4", border: "1px solid #86efac" }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 600 }}>
              MOST PROFITABLE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#16a34a", my: 1 }}>
              {bestAccount.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              ${bestAccount.totalProfit.toFixed(2)} profit
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, bgcolor: "#eff6ff", border: "1px solid #93c5fd" }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: "#1e40af", fontWeight: 600 }}>
              HIGHEST WIN RATE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#2563eb", my: 1 }}>
              {bestWinRate.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              {bestWinRate.winRate.toFixed(1)}% win rate
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, bgcolor: "#fef3c7", border: "1px solid #fcd34d" }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 600 }}>
              TOTAL ACCOUNTS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#b45309", my: 1 }}>
              {accountStats.length}
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              {accountStats.reduce((sum, s) => sum + s.totalTrades, 0)} total trades
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Charts */}
      <Stack spacing={3}>
        {/* Comparison Bar Chart */}
        <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Performance Metrics Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Win Rate" fill="#3b82f6" />
                <Bar dataKey="Profit Factor" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        {radarData.length >= 2 && (
          <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Multi-Dimensional Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="account" style={{ fontSize: 11 }} />
                  <PolarRadiusAxis style={{ fontSize: 10 }} />
                  <Radar name="Performance" dataKey="Win Rate" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                  <Radar name="Activity" dataKey="Trades" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Radar name="Profit" dataKey="Profit" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed Table */}
        <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Detailed Comparison
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Account</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Trades</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Win Rate</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>W/L</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Total P/L</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Avg Win</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Avg Loss</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>P-Factor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accountStats.map((stats, index) => (
                    <TableRow 
                      key={stats.name}
                      sx={{ 
                        '&:hover': { bgcolor: "#f9fafb" },
                        bgcolor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {stats.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{stats.totalTrades}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                          <Box sx={{ width: 60 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={stats.winRate} 
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: "#e5e7eb",
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: stats.winRate >= 50 ? "#10b981" : "#ef4444",
                                }
                              }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 40 }}>
                            {stats.winRate.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {stats.wins}/{stats.losses}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`$${stats.totalProfit.toFixed(2)}`}
                          size="small"
                          sx={{
                            bgcolor: stats.totalProfit >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: stats.totalProfit >= 0 ? "#10b981" : "#ef4444",
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 500 }}>
                          ${stats.avgWin.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 500 }}>
                          ${stats.avgLoss.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 600,
                            color: stats.profitFactor >= 2 ? "#10b981" : stats.profitFactor >= 1 ? "#6366f1" : "#ef4444"
                          }}
                        >
                          {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

