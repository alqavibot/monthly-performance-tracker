import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useState } from "react";

// Parse date from "DATE/DAY" field (format: "26 Oct - Sunday")
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
    const date = new Date(year, monthIndex, parseInt(day));
    return date;
  } catch (err) {
    console.warn("Failed to parse date:", dateString, err);
    return null;
  }
}

export default function PerformanceCharts({ rows }) {
  const [chartType, setChartType] = useState("line");

  // Process data for performance over time
  const performanceData = useMemo(() => {
    // Filter trades with P/L (actual profit/loss data from user)
    const validTrades = rows.filter(row => {
      const plAmount = parseFloat(row["P/L"]);
      const date = parseTradeDate(row["DATE/DAY"]);
      return !isNaN(plAmount) && date;
    });

    // Group by date
    const dateMap = new Map();
    let cumulativeProfit = 0;

    validTrades
      .sort((a, b) => {
        const dateA = parseTradeDate(a["DATE/DAY"]);
        const dateB = parseTradeDate(b["DATE/DAY"]);
        return dateA - dateB;
      })
      .forEach(row => {
        const date = parseTradeDate(row["DATE/DAY"]);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const plAmount = parseFloat(row["P/L"]) || 0;
        
        cumulativeProfit += plAmount;

        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: dateStr,
            profit: 0,
            loss: 0,
            cumulative: 0,
            trades: 0,
          });
        }

        const entry = dateMap.get(dateStr);
        if (plAmount > 0) {
          entry.profit += plAmount;
        } else {
          entry.loss += Math.abs(plAmount);
        }
        entry.cumulative = cumulativeProfit;
        entry.trades += 1;
      });

    return Array.from(dateMap.values());
  }, [rows]);

  const totalProfit = useMemo(() => {
    return performanceData.reduce((sum, item) => sum + item.profit - item.loss, 0);
  }, [performanceData]);

  const avgDailyProfit = useMemo(() => {
    if (performanceData.length === 0) return 0;
    return totalProfit / performanceData.length;
  }, [totalProfit, performanceData]);

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
              {entry.name}: ${Math.abs(entry.value).toFixed(2)}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (performanceData.length === 0) {
    return (
      <Card sx={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            📊 Performance Over Time
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No performance data available yet. Start adding trades and enter P/L amounts (positive for profit, negative for loss).
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
              📊 Performance Over Time
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Total P/L
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700, 
                    color: totalProfit >= 0 ? "#10b981" : "#ef4444" 
                  }}
                >
                  ${totalProfit.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Avg Daily P/L
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700, 
                    color: avgDailyProfit >= 0 ? "#10b981" : "#ef4444" 
                  }}
                >
                  ${avgDailyProfit.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Trading Days
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#6366f1" }}>
                  {performanceData.length}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(e, newType) => newType && setChartType(newType)}
            size="small"
          >
            <ToggleButton value="line">Line</ToggleButton>
            <ToggleButton value="bar">Bar</ToggleButton>
            <ToggleButton value="area">Area</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <ResponsiveContainer width="100%" height={350}>
          {chartType === "line" ? (
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Profit"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="loss" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Loss"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#6366f1" 
                strokeWidth={3}
                name="Cumulative P/L"
                dot={{ r: 5 }}
              />
            </LineChart>
          ) : chartType === "bar" ? (
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="profit" fill="#10b981" name="Profit" />
              <Bar dataKey="loss" fill="#ef4444" name="Loss" />
            </BarChart>
          ) : (
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#6366f1" 
                fill="#6366f1"
                fillOpacity={0.6}
                name="Cumulative P/L"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

