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
  LinearProgress,
  Stack,
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
  Cell,
} from "recharts";

export default function InstrumentAnalysis({ rows }) {
  // Analyze performance by instrument
  const instrumentStats = useMemo(() => {
    const statsMap = new Map();

    rows.forEach(row => {
      const instrument = (row["INTRUMENT"] || "").trim().toUpperCase();
      const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
      const risk = parseFloat(row["CALCULATED RISK"]) || 0;

      if (!instrument || !tpOrSl) return;

      if (!statsMap.has(instrument)) {
        statsMap.set(instrument, {
          instrument,
          tp: 0,
          sl: 0,
          total: 0,
          winRate: 0,
          totalProfit: 0,
          totalLoss: 0,
          netPL: 0,
          avgProfit: 0,
          avgLoss: 0,
          profitFactor: 0,
        });
      }

      const stats = statsMap.get(instrument);
      stats.total += 1;

      if (tpOrSl.includes("tp") || tpOrSl.includes("take profit")) {
        stats.tp += 1;
        stats.totalProfit += risk;
      } else if (tpOrSl.includes("sl") || tpOrSl.includes("stop loss")) {
        stats.sl += 1;
        stats.totalLoss += risk;
      }

      // Calculate derived metrics
      stats.winRate = stats.total > 0 ? (stats.tp / stats.total) * 100 : 0;
      stats.netPL = stats.totalProfit - stats.totalLoss;
      stats.avgProfit = stats.tp > 0 ? stats.totalProfit / stats.tp : 0;
      stats.avgLoss = stats.sl > 0 ? stats.totalLoss / stats.sl : 0;
      stats.profitFactor = stats.totalLoss > 0 ? stats.totalProfit / stats.totalLoss : stats.totalProfit > 0 ? Infinity : 0;
    });

    // Sort by net P/L (best performing first)
    return Array.from(statsMap.values())
      .sort((a, b) => b.netPL - a.netPL);
  }, [rows]);

  // Chart data (top 10 instruments by trade count)
  const chartData = useMemo(() => {
    return instrumentStats
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(stat => ({
        instrument: stat.instrument,
        winRate: parseFloat(stat.winRate.toFixed(1)),
        trades: stat.total,
        netPL: parseFloat(stat.netPL.toFixed(2)),
      }));
  }, [instrumentStats]);

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
              {entry.name}: {entry.name === "Win Rate" ? `${entry.value}%` : entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (instrumentStats.length === 0) {
    return (
      <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            🎯 Instrument Performance
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No instrument data available yet. Start adding trades with instruments and outcomes.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const bestInstrument = instrumentStats[0];
  const totalTrades = instrumentStats.reduce((sum, stat) => sum + stat.total, 0);

  return (
    <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          🎯 Instrument Performance
        </Typography>
        
        {/* Summary Stats */}
        <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Best Performer
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#10b981" }}>
              {bestInstrument.instrument}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              ${bestInstrument.netPL.toFixed(2)} P/L
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Instruments Traded
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#6366f1" }}>
              {instrumentStats.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Total Trades
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1f2937" }}>
              {totalTrades}
            </Typography>
          </Box>
        </Stack>

        {/* Win Rate Chart */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Win Rate by Instrument (Top 10)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                type="number"
                domain={[0, 100]}
                stroke="#6b7280"
                style={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="category"
                dataKey="instrument" 
                stroke="#6b7280"
                style={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.winRate >= 50 ? "#10b981" : "#ef4444"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Detailed Table */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Detailed Statistics
          </Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Instrument</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Trades</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Win Rate</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>TP/SL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Net P/L</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Avg Win</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>Avg Loss</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#fafafa" }}>P-Factor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instrumentStats.map((stat, index) => (
                  <TableRow 
                    key={stat.instrument}
                    sx={{ 
                      '&:hover': { bgcolor: "#f9fafb" },
                      bgcolor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {stat.instrument}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{stat.total}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 60 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={stat.winRate} 
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "#e5e7eb",
                              '& .MuiLinearProgress-bar': {
                                bgcolor: stat.winRate >= 50 ? "#10b981" : "#ef4444",
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 40 }}>
                          {stat.winRate.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {stat.tp}/{stat.sl}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`$${stat.netPL.toFixed(2)}`}
                        size="small"
                        sx={{
                          bgcolor: stat.netPL >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: stat.netPL >= 0 ? "#10b981" : "#ef4444",
                          fontWeight: 600,
                          fontSize: 11,
                          border: `1px solid ${stat.netPL >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 500 }}>
                        ${stat.avgProfit.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 500 }}>
                        ${stat.avgLoss.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 600,
                          color: stat.profitFactor >= 2 ? "#10b981" : stat.profitFactor >= 1 ? "#6366f1" : "#ef4444"
                        }}
                      >
                        {stat.profitFactor === Infinity ? "∞" : stat.profitFactor.toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Legend */}
        <Box sx={{ mt: 2, p: 2, bgcolor: "#f9fafb", borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
            <strong>P-Factor (Profit Factor):</strong> Ratio of total profit to total loss. 
            Higher is better. &gt;2.0 is excellent, 1.0-2.0 is good, &lt;1.0 needs improvement.
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            <strong>Avg Win/Loss:</strong> Average profit per winning trade vs average loss per losing trade.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

