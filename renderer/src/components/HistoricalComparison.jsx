import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Grid,
  Divider,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useThemeMode } from "../ThemeContext";

// Parse date
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
    return new Date(year, monthIndex, parseInt(day));
  } catch (err) {
    return null;
  }
}

function getMonthName(monthIndex) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthIndex];
}

export default function HistoricalComparison({ rows }) {
  const { mode } = useThemeMode();
  const comparison = useMemo(() => {
    const validTrades = rows.filter(row => {
      const plValue = parseFloat(row["P/L"]);
      const date = parseTradeDate(row["DATE/DAY"]);
      return !isNaN(plValue) && date;
    });

    if (validTrades.length === 0) {
      return { insufficientData: true };
    }

    // Group by month
    const monthlyData = new Map();
    
    validTrades.forEach(row => {
      const date = parseTradeDate(row["DATE/DAY"]);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const plValue = parseFloat(row["P/L"]);
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.getMonth(),
          year: date.getFullYear(),
          trades: [],
          totalProfit: 0,
          wins: 0,
          losses: 0,
        });
      }
      
      const data = monthlyData.get(monthKey);
      data.trades.push(row);
      data.totalProfit += plValue;
      
      if (plValue > 0) data.wins++;
      else if (plValue < 0) data.losses++;
    });

    // Get current and previous month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const prevMonthKey = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${now.getMonth() === 0 ? 11 : now.getMonth() - 1}`;
    
    const currentMonth = monthlyData.get(currentMonthKey);
    const prevMonth = monthlyData.get(prevMonthKey);

    if (!currentMonth && !prevMonth) {
      return { insufficientData: true };
    }

    const calculateStats = (data) => {
      if (!data) return null;
      
      const winRate = data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0;
      const avgWin = data.wins > 0 ? data.trades.filter(r => parseFloat(r["P/L"]) > 0).reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / data.wins : 0;
      const avgLoss = data.losses > 0 ? Math.abs(data.trades.filter(r => parseFloat(r["P/L"]) < 0).reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / data.losses) : 0;
      
      return {
        totalTrades: data.trades.length,
        wins: data.wins,
        losses: data.losses,
        winRate,
        totalProfit: data.totalProfit,
        avgWin,
        avgLoss,
        month: data.month,
        year: data.year,
      };
    };

    const current = calculateStats(currentMonth);
    const previous = calculateStats(prevMonth);

    // Calculate changes
    const changes = {};
    if (current && previous) {
      changes.trades = current.totalTrades - previous.totalTrades;
      changes.winRate = current.winRate - previous.winRate;
      changes.profit = current.totalProfit - previous.totalProfit;
      changes.avgWin = current.avgWin - previous.avgWin;
    }

    // Prepare chart data (last 6 months)
    const chartData = Array.from(monthlyData.entries())
      .map(([key, data]) => {
        const stats = calculateStats(data);
        return {
          month: getMonthName(data.month).substring(0, 3),
          "Total P/L": parseFloat(stats.totalProfit.toFixed(2)),
          "Win Rate": parseFloat(stats.winRate.toFixed(1)),
          "Trades": stats.totalTrades,
        };
      })
      .sort((a, b) => {
        // Sort by month order
        const monthOrder = {'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                           'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11};
        return monthOrder[a.month] - monthOrder[b.month];
      })
      .slice(-6); // Last 6 months

    return {
      insufficientData: false,
      current,
      previous,
      changes,
      chartData,
    };
  }, [rows]);

  if (comparison.insufficientData) {
    return (
      <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <CompareArrowsIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Historical Comparison
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            Not enough historical data yet. Trade for at least 2 months to see month-over-month comparisons.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { current, previous, changes, chartData } = comparison;

  const ComparisonMetric = ({ label, currentValue, previousValue, change, isPercentage, isCurrency, reverse }) => {
    const hasChange = change !== undefined && change !== null && !isNaN(change);
    const isPositive = reverse ? change < 0 : change > 0;
    const changeColor = isPositive ? "#10b981" : "#ef4444";
    
    const currentVal = currentValue !== undefined && currentValue !== null ? currentValue : 0;
    const prevVal = previousValue !== undefined && previousValue !== null ? previousValue : null;

    return (
      <Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
          {label}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isCurrency && "$"}{currentVal.toFixed(isPercentage ? 1 : 2)}{isPercentage && "%"}
          </Typography>
          {hasChange && (
            <Chip
              icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${change > 0 ? "+" : ""}${isCurrency ? "$" : ""}${change.toFixed(isPercentage ? 1 : 2)}${isPercentage ? "%" : ""}`}
              size="small"
              sx={{
                bgcolor: `${changeColor}15`,
                color: changeColor,
                fontWeight: 600,
                fontSize: 11,
                "& .MuiChip-icon": {
                  color: changeColor,
                },
              }}
            />
          )}
        </Stack>
        {prevVal !== null && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
            vs {isCurrency && "$"}{prevVal.toFixed(isPercentage ? 1 : 2)}{isPercentage && "%"} last month
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <CompareArrowsIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Historical Comparison
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {current && getMonthName(current.month)} vs {previous && getMonthName(previous.month)}
          </Typography>
        </CardContent>
      </Card>

      {/* Key Metrics Comparison */}
      <Card sx={{ mb: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
            Month-over-Month Performance
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <ComparisonMetric
                label="Total Trades"
                currentValue={current?.totalTrades ?? 0}
                previousValue={previous?.totalTrades ?? null}
                change={changes?.trades ?? null}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ComparisonMetric
                label="Win Rate"
                currentValue={current?.winRate ?? 0}
                previousValue={previous?.winRate ?? null}
                change={changes?.winRate ?? null}
                isPercentage
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ComparisonMetric
                label="Total Profit/Loss"
                currentValue={current?.totalProfit ?? 0}
                previousValue={previous?.totalProfit ?? null}
                change={changes?.profit ?? null}
                isCurrency
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ComparisonMetric
                label="Average Win"
                currentValue={current?.avgWin ?? 0}
                previousValue={previous?.avgWin ?? null}
                change={changes?.avgWin ?? null}
                isCurrency
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts */}
      <Stack spacing={3}>
        {/* P/L Trend */}
        <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Profit/Loss Trend
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value) => `$${value}`}
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    border: "1px solid #374151",
                    borderRadius: 4,
                  }}
                />
                <Legend />
                <Bar dataKey="Total P/L" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win Rate Trend */}
        <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Win Rate & Activity Trend
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#6b7280"
                  style={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    border: "1px solid #374151",
                    borderRadius: 4,
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="Win Rate" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="Trades" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Side-by-Side Comparison */}
        <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Side-by-Side Comparison
            </Typography>
            <Grid container spacing={2}>
              {/* Current Month */}
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 2, border: "1px solid #86efac" }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: "#15803d", mb: 2 }}>
                    {current && getMonthName(current.month)} {current?.year} (Current)
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Total Trades</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{current?.totalTrades}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Wins / Losses</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{current?.wins} / {current?.losses}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Win Rate</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#10b981" }}>{current?.winRate.toFixed(1)}%</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Total P/L</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: current?.totalProfit >= 0 ? "#10b981" : "#ef4444" }}>
                        ${current?.totalProfit.toFixed(2)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Previous Month */}
              {previous && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2, border: "1px solid #e5e7eb" }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: "#6b7280", mb: 2 }}>
                      {getMonthName(previous.month)} {previous.year} (Previous)
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>Total Trades</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{previous.totalTrades}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>Wins / Losses</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{previous.wins} / {previous.losses}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>Win Rate</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{previous.winRate.toFixed(1)}%</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>Total P/L</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: previous.totalProfit >= 0 ? "#10b981" : "#ef4444" }}>
                          ${previous.totalProfit.toFixed(2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

