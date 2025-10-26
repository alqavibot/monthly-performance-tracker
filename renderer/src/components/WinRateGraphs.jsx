import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Chip,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const COLORS = {
  tp: "#10b981",
  sl: "#ef4444",
};

// Parse date from "DATE/DAY" field (format: "26 Oct - Sunday")
function parseTradeDate(dateString) {
  if (!dateString) return null;
  try {
    const parts = dateString.split(" - ")[0].trim();
    const [day, month] = parts.split(" ");
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const monthIndex = monthMap[month];
    const year = new Date().getFullYear();
    const date = new Date(year, monthIndex, parseInt(day));
    return date;
  } catch (err) {
    return null;
  }
}

// Get week number of year
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Get start of week (Sunday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export default function WinRateGraphs({ rows }) {
  const [viewMode, setViewMode] = useState("weekly");

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const tpTrades = rows.filter(row => {
      const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
      return tpOrSl.includes("tp") || tpOrSl.includes("take profit");
    });

    const slTrades = rows.filter(row => {
      const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
      return tpOrSl.includes("sl") || tpOrSl.includes("stop loss");
    });

    const total = tpTrades.length + slTrades.length;
    const winRate = total > 0 ? (tpTrades.length / total) * 100 : 0;

    return {
      tp: tpTrades.length,
      sl: slTrades.length,
      total,
      winRate,
    };
  }, [rows]);

  // Process data by week or month
  const timeSeriesData = useMemo(() => {
    const validTrades = rows.filter(row => {
      const date = parseTradeDate(row["DATE/DAY"]);
      const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
      return date && (tpOrSl.includes("tp") || tpOrSl.includes("sl"));
    });

    if (viewMode === "weekly") {
      // Group by week
      const weekMap = new Map();

      validTrades.forEach(row => {
        const date = parseTradeDate(row["DATE/DAY"]);
        const weekStart = getWeekStart(date);
        const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            period: weekKey,
            tp: 0,
            sl: 0,
            total: 0,
            winRate: 0,
            date: weekStart,
          });
        }

        const entry = weekMap.get(weekKey);
        const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
        
        if (tpOrSl.includes("tp")) {
          entry.tp += 1;
        } else if (tpOrSl.includes("sl")) {
          entry.sl += 1;
        }
        entry.total = entry.tp + entry.sl;
        entry.winRate = entry.total > 0 ? ((entry.tp / entry.total) * 100).toFixed(1) : 0;
      });

      return Array.from(weekMap.values())
        .sort((a, b) => a.date - b.date)
        .map(entry => ({
          ...entry,
          period: `Week ${entry.period}`,
        }));
    } else {
      // Group by month
      const monthMap = new Map();

      validTrades.forEach(row => {
        const date = parseTradeDate(row["DATE/DAY"]);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            period: monthKey,
            tp: 0,
            sl: 0,
            total: 0,
            winRate: 0,
            month: date.getMonth(),
          });
        }

        const entry = monthMap.get(monthKey);
        const tpOrSl = (row["TP OR SL ?"] || "").toLowerCase().trim();
        
        if (tpOrSl.includes("tp")) {
          entry.tp += 1;
        } else if (tpOrSl.includes("sl")) {
          entry.sl += 1;
        }
        entry.total = entry.tp + entry.sl;
        entry.winRate = entry.total > 0 ? ((entry.tp / entry.total) * 100).toFixed(1) : 0;
      });

      return Array.from(monthMap.values())
        .sort((a, b) => a.month - b.month);
    }
  }, [rows, viewMode]);

  // Data for pie chart
  const pieData = [
    { name: "Take Profit", value: overallStats.tp, color: COLORS.tp },
    { name: "Stop Loss", value: overallStats.sl, color: COLORS.sl },
  ];

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
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (overallStats.total === 0) {
    return (
      <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            📈 Win Rate Analysis
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No trade outcomes recorded yet. Start marking trades as TP or SL to see win rate analysis.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              📈 Win Rate Analysis
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={`${overallStats.winRate.toFixed(1)}% Win Rate`}
                sx={{
                  bgcolor: overallStats.winRate >= 50 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: overallStats.winRate >= 50 ? "#10b981" : "#ef4444",
                  fontWeight: 700,
                  fontSize: 14,
                  border: `1px solid ${overallStats.winRate >= 50 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {overallStats.tp} wins / {overallStats.total} trades
              </Typography>
            </Stack>
          </Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 3 }}>
          {/* Pie Chart */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, textAlign: "center" }}>
              Overall Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Time Series Chart */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, textAlign: "center" }}>
              {viewMode === "weekly" ? "Weekly" : "Monthly"} Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="tp" fill={COLORS.tp} name="TP" stackId="a" />
                <Bar dataKey="sl" fill={COLORS.sl} name="SL" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Win Rate Trend Line */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, textAlign: "center" }}>
            Win Rate Trend
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                stroke="#6b7280"
                style={{ fontSize: 11 }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value) => `${value}%`}
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.9)",
                  border: "1px solid #374151",
                  borderRadius: 4,
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="winRate" 
                stroke="#6366f1" 
                strokeWidth={3}
                name="Win Rate (%)"
                dot={{ r: 5, fill: "#6366f1" }}
              />
              {/* Reference line at 50% */}
              <Line 
                type="monotone" 
                dataKey={() => 50} 
                stroke="#9ca3af" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="50% Baseline"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

