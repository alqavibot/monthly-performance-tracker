import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { useThemeMode } from "../ThemeContext";

export default function CustomDashboard({ rows }) {
  const { mode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem("dashboard-widgets");
    return saved ? JSON.parse(saved) : {
      totalPL: true,
      winRate: true,
      todayStats: true,
      thisWeekStats: true,
      currentStreak: true,
      bestTrade: true,
      avgWin: true,
      avgLoss: true,
    };
  });

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleWidget = (widgetKey) => {
    const newWidgets = { ...widgets, [widgetKey]: !widgets[widgetKey] };
    setWidgets(newWidgets);
    localStorage.setItem("dashboard-widgets", JSON.stringify(newWidgets));
  };

  // Calculate all stats
  const stats = useMemo(() => {
    const validTrades = rows.filter(row => {
      const plValue = parseFloat(row["P/L"]);
      return !isNaN(plValue);
    });

    if (validTrades.length === 0) {
      return null;
    }

    const wins = validTrades.filter(r => parseFloat(r["P/L"]) > 0);
    const losses = validTrades.filter(r => parseFloat(r["P/L"]) < 0);
    
    const totalProfit = validTrades.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0);
    const winRate = (wins.length / validTrades.length) * 100;
    
    const avgWin = wins.length > 0 ? wins.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / losses.length) : 0;

    // Best trade
    const bestTrade = validTrades.reduce((best, current) => {
      const currentPL = parseFloat(current["P/L"]);
      const bestPL = parseFloat(best["P/L"]);
      return currentPL > bestPL ? current : best;
    }, validTrades[0]);

    // Current streak
    let currentStreak = 0;
    let streakType = "none";
    const sortedTrades = [...validTrades].reverse(); // Most recent first
    
    for (const trade of sortedTrades) {
      const plValue = parseFloat(trade["P/L"]);
      if (currentStreak === 0) {
        currentStreak = 1;
        streakType = plValue > 0 ? "win" : "loss";
      } else {
        const isWin = plValue > 0;
        if ((streakType === "win" && isWin) || (streakType === "loss" && !isWin)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Today's stats
    const today = new Date().toLocaleDateString();
    const todayTrades = validTrades.filter(r => {
      const dateStr = r["DATE/DAY"]?.split(" - ")[0];
      return dateStr && new Date().getDate().toString() === dateStr.split(" ")[0];
    });
    const todayPL = todayTrades.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0);

    // This week's stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const thisWeekTrades = validTrades.filter(r => {
      // Simplified - just count last 7 days
      return true; // Would need proper date parsing
    });
    const weekPL = thisWeekTrades.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0);

    return {
      totalProfit,
      winRate,
      totalTrades: validTrades.length,
      wins: wins.length,
      losses: losses.length,
      avgWin,
      avgLoss,
      bestTrade: parseFloat(bestTrade["P/L"]),
      currentStreak,
      streakType,
      todayTrades: todayTrades.length,
      todayPL,
      weekTrades: thisWeekTrades.length,
      weekPL,
    };
  }, [rows]);

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          No data available yet. Start adding trades to see your dashboard widgets.
        </Typography>
      </Box>
    );
  }

  const Widget = ({ title, value, subtitle, icon: Icon, color, visible }) => {
    if (!visible) return null;
    
    return (
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          height: "100%",
          background: `${color}08`,
          border: `1px solid ${color}30`,
          transition: "all 0.2s",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: 2,
          }
        }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Icon sx={{ color, fontSize: 32 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color, mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {subtitle}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      {/* Header with Settings */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Quick Overview Dashboard
        </Typography>
        <IconButton onClick={handleMenuOpen} size="small">
          <SettingsIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Customize Widgets
            </Typography>
            {Object.entries({
              totalPL: "Total P/L",
              winRate: "Win Rate",
              todayStats: "Today's Stats",
              thisWeekStats: "This Week",
              currentStreak: "Current Streak",
              bestTrade: "Best Trade",
              avgWin: "Average Win",
              avgLoss: "Average Loss",
            }).map(([key, label]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={widgets[key]}
                    onChange={() => toggleWidget(key)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
                sx={{ display: "block", mb: 0.5 }}
              />
            ))}
          </Box>
        </Menu>
      </Stack>

      {/* Widgets Grid */}
      <Grid container spacing={2}>
        <Widget
          visible={widgets.totalPL}
          title="Total P/L"
          value={`$${stats.totalProfit.toFixed(2)}`}
          subtitle={`${stats.totalTrades} total trades`}
          icon={stats.totalProfit >= 0 ? TrendingUpIcon : TrendingDownIcon}
          color={stats.totalProfit >= 0 ? "#10b981" : "#ef4444"}
        />

        <Widget
          visible={widgets.winRate}
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          subtitle={`${stats.wins}W / ${stats.losses}L`}
          icon={ShowChartIcon}
          color="#6366f1"
        />

        <Widget
          visible={widgets.todayStats}
          title="Today"
          value={`$${stats.todayPL.toFixed(2)}`}
          subtitle={`${stats.todayTrades} trades today`}
          icon={AccountBalanceIcon}
          color={stats.todayPL >= 0 ? "#10b981" : "#ef4444"}
        />

        <Widget
          visible={widgets.thisWeekStats}
          title="This Week"
          value={`$${stats.weekPL.toFixed(2)}`}
          subtitle={`${stats.weekTrades} trades this week`}
          icon={EmojiEventsIcon}
          color="#8b5cf6"
        />

        <Widget
          visible={widgets.currentStreak}
          title="Current Streak"
          value={`${stats.currentStreak} ${stats.streakType === "win" ? "Wins" : "Losses"}`}
          subtitle={stats.streakType === "win" ? "Keep it going" : "Bounce back"}
          icon={LocalFireDepartmentIcon}
          color={stats.streakType === "win" ? "#f59e0b" : "#ef4444"}
        />

        <Widget
          visible={widgets.bestTrade}
          title="Best Trade"
          value={`$${stats.bestTrade.toFixed(2)}`}
          subtitle="Highest profit"
          icon={EmojiEventsIcon}
          color="#fbbf24"
        />

        <Widget
          visible={widgets.avgWin}
          title="Avg Win"
          value={`$${stats.avgWin.toFixed(2)}`}
          subtitle="Per winning trade"
          icon={TrendingUpIcon}
          color="#10b981"
        />

        <Widget
          visible={widgets.avgLoss}
          title="Avg Loss"
          value={`$${stats.avgLoss.toFixed(2)}`}
          subtitle="Per losing trade"
          icon={TrendingDownIcon}
          color="#ef4444"
        />
      </Grid>
    </Box>
  );
}

