import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Grid,
  Divider,
  Avatar,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import StarIcon from "@mui/icons-material/Star";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { useThemeMode } from "../ThemeContext";

// Parse date from "DATE/DAY" field
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

// Get week start
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export default function AchievementsPage({ rows }) {
  const { mode } = useThemeMode();
  // Calculate all achievements and records
  const stats = useMemo(() => {
    const validTrades = rows.filter(row => {
      const plValue = parseFloat(row["P/L"]);
      return !isNaN(plValue);
    }).sort((a, b) => {
      const dateA = parseTradeDate(a["DATE/DAY"]);
      const dateB = parseTradeDate(b["DATE/DAY"]);
      return dateA - dateB;
    });

    // Personal Records
    let bestDay = { date: null, profit: 0 };
    let worstDay = { date: null, loss: 0 };
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let totalTrades = validTrades.length;
    let totalWins = 0;
    let totalLosses = 0;
    let totalProfit = 0;
    let biggestWin = 0;
    let biggestLoss = 0;

    // Group by day
    const dailyPL = new Map();
    validTrades.forEach(row => {
      const date = parseTradeDate(row["DATE/DAY"]);
      const dateStr = date.toLocaleDateString();
      const plValue = parseFloat(row["P/L"]);
      
      if (!dailyPL.has(dateStr)) {
        dailyPL.set(dateStr, 0);
      }
      dailyPL.set(dateStr, dailyPL.get(dateStr) + plValue);
    });

    // Find best/worst day
    dailyPL.forEach((pl, date) => {
      if (pl > bestDay.profit) {
        bestDay = { date, profit: pl };
      }
      if (pl < worstDay.loss) {
        worstDay = { date, loss: pl };
      }
    });

    // Calculate streaks and other stats
    validTrades.forEach(row => {
      const plValue = parseFloat(row["P/L"]);
      totalProfit += plValue;

      if (plValue > 0) {
        totalWins++;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > longestWinStreak) {
          longestWinStreak = currentWinStreak;
        }
        if (plValue > biggestWin) {
          biggestWin = plValue;
        }
      } else if (plValue < 0) {
        totalLosses++;
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > longestLossStreak) {
          longestLossStreak = currentLossStreak;
        }
        if (Math.abs(plValue) > Math.abs(biggestLoss)) {
          biggestLoss = plValue;
        }
      }
    });

    // Best week
    const weeklyPL = new Map();
    validTrades.forEach(row => {
      const date = parseTradeDate(row["DATE/DAY"]);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toLocaleDateString();
      const plValue = parseFloat(row["P/L"]);
      
      if (!weeklyPL.has(weekKey)) {
        weeklyPL.set(weekKey, 0);
      }
      weeklyPL.set(weekKey, weeklyPL.get(weekKey) + plValue);
    });

    let bestWeek = { date: null, profit: 0 };
    weeklyPL.forEach((pl, date) => {
      if (pl > bestWeek.profit) {
        bestWeek = { date, profit: pl };
      }
    });

    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const avgWin = totalWins > 0 ? totalProfit / totalWins : 0;
    const profitFactor = totalLosses > 0 ? (totalWins * avgWin) / (totalLosses * Math.abs(totalProfit - totalWins * avgWin)) : 0;

    return {
      totalTrades,
      totalWins,
      totalLosses,
      totalProfit,
      winRate,
      longestWinStreak,
      longestLossStreak,
      currentWinStreak,
      currentLossStreak,
      bestDay,
      worstDay,
      bestWeek,
      biggestWin,
      biggestLoss,
      profitFactor,
    };
  }, [rows]);

  // Define achievements/milestones
  const achievements = [
    {
      id: "first_win",
      title: "First Victory",
      description: "Win your first trade",
      icon: "🎯",
      color: "#10b981",
      unlocked: stats.totalWins >= 1,
      progress: Math.min((stats.totalWins / 1) * 100, 100),
    },
    {
      id: "10_trades",
      title: "Getting Started",
      description: "Complete 10 trades",
      icon: "📊",
      color: "#6366f1",
      unlocked: stats.totalTrades >= 10,
      progress: Math.min((stats.totalTrades / 10) * 100, 100),
    },
    {
      id: "50_trades",
      title: "Experienced Trader",
      description: "Complete 50 trades",
      icon: "💼",
      color: "#8b5cf6",
      unlocked: stats.totalTrades >= 50,
      progress: Math.min((stats.totalTrades / 50) * 100, 100),
    },
    {
      id: "100_trades",
      title: "Century Club",
      description: "Complete 100 trades",
      icon: "💯",
      color: "#ec4899",
      unlocked: stats.totalTrades >= 100,
      progress: Math.min((stats.totalTrades / 100) * 100, 100),
    },
    {
      id: "win_streak_3",
      title: "Hot Streak",
      description: "Win 3 trades in a row",
      icon: "🔥",
      color: "#f59e0b",
      unlocked: stats.longestWinStreak >= 3,
      progress: Math.min((stats.longestWinStreak / 3) * 100, 100),
    },
    {
      id: "win_streak_5",
      title: "On Fire",
      description: "Win 5 trades in a row",
      icon: "🚀",
      color: "#ef4444",
      unlocked: stats.longestWinStreak >= 5,
      progress: Math.min((stats.longestWinStreak / 5) * 100, 100),
    },
    {
      id: "win_streak_10",
      title: "Unstoppable",
      description: "Win 10 trades in a row",
      icon: "⚡",
      color: "#dc2626",
      unlocked: stats.longestWinStreak >= 10,
      progress: Math.min((stats.longestWinStreak / 10) * 100, 100),
    },
    {
      id: "win_rate_60",
      title: "Consistent Winner",
      description: "Achieve 60% win rate",
      icon: "🎖️",
      color: "#14b8a6",
      unlocked: stats.winRate >= 60 && stats.totalTrades >= 20,
      progress: Math.min((stats.winRate / 60) * 100, 100),
    },
    {
      id: "win_rate_70",
      title: "Master Trader",
      description: "Achieve 70% win rate",
      icon: "👑",
      color: "#fbbf24",
      unlocked: stats.winRate >= 70 && stats.totalTrades >= 20,
      progress: Math.min((stats.winRate / 70) * 100, 100),
    },
    {
      id: "profitable",
      title: "In the Green",
      description: "Reach positive total profit",
      icon: "💰",
      color: "#22c55e",
      unlocked: stats.totalProfit > 0,
      progress: stats.totalProfit > 0 ? 100 : 0,
    },
    {
      id: "profit_factor_2",
      title: "Disciplined Trader",
      description: "Achieve 2.0+ Profit Factor",
      icon: "📈",
      color: "#3b82f6",
      unlocked: stats.profitFactor >= 2,
      progress: Math.min((stats.profitFactor / 2) * 100, 100),
    },
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <Box>
      {/* Current Streak Alert */}
      {stats.currentWinStreak >= 3 && (
        <Card sx={{ 
          mb: 3, 
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
        }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <LocalFireDepartmentIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  🔥 {stats.currentWinStreak} Wins in a Row!
                </Typography>
                <Typography variant="body2">
                  You're on fire! Stay disciplined and keep following your strategy. Great momentum!
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {stats.currentLossStreak >= 3 && (
        <Card sx={{ 
          mb: 3, 
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "white",
        }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 50, height: 50 }}>
                💪
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Stay Strong! {stats.currentLossStreak} Losses in a Row
                </Typography>
                <Typography variant="body2">
                  Every champion has faced setbacks. Review your strategy, take a break if needed, and come back stronger. You've got this! 💪
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Personal Records */}
      <Card sx={{ mb: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <EmojiEventsIcon sx={{ color: "#fbbf24", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Personal Records
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 2, border: "1px solid #86efac" }}>
                <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 600 }}>
                  BEST DAY
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#16a34a", my: 1 }}>
                  ${stats.bestDay.profit.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  {stats.bestDay.date || "N/A"}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: "#eff6ff", borderRadius: 2, border: "1px solid #93c5fd" }}>
                <Typography variant="caption" sx={{ color: "#1e40af", fontWeight: 600 }}>
                  BEST WEEK
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#2563eb", my: 1 }}>
                  ${stats.bestWeek.profit.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  Week of {stats.bestWeek.date || "N/A"}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: "#fef3c7", borderRadius: 2, border: "1px solid #fcd34d" }}>
                <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 600 }}>
                  LONGEST WIN STREAK
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#b45309", my: 1 }}>
                  {stats.longestWinStreak}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  consecutive wins
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: "#fef2f2", borderRadius: 2, border: "1px solid #fca5a5" }}>
                <Typography variant="caption" sx={{ color: "#991b1b", fontWeight: 600 }}>
                  BIGGEST WIN
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#dc2626", my: 1 }}>
                  ${stats.biggestWin.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  single trade
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: "#f5f3ff", borderRadius: 2, border: "1px solid #c4b5fd" }}>
                <Typography variant="caption" sx={{ color: "#5b21b6", fontWeight: 600 }}>
                  WIN RATE
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#7c3aed", my: 1 }}>
                  {stats.winRate.toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  {stats.totalWins} / {stats.totalTrades} trades
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: "#ecfdf5", borderRadius: 2, border: "1px solid #6ee7b7" }}>
                <Typography variant="caption" sx={{ color: "#065f46", fontWeight: 600 }}>
                  TOTAL PROFIT
                </Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    color: stats.totalProfit >= 0 ? "#059669" : "#dc2626", 
                    my: 1 
                  }}
                >
                  ${stats.totalProfit.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                  all time
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <WorkspacePremiumIcon sx={{ color: "#fbbf24", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Achievements & Milestones
            </Typography>
            <Chip 
              label={`${unlockedAchievements.length}/${achievements.length}`}
              size="small"
              sx={{ 
                bgcolor: "rgba(251, 191, 36, 0.1)",
                color: "#fbbf24",
                fontWeight: 700,
              }}
            />
          </Stack>

          {/* Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "#10b981" }}>
                🏆 Unlocked ({unlockedAchievements.length})
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {unlockedAchievements.map(achievement => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <Card sx={{ 
                      bgcolor: achievement.color + "10",
                      border: `2px solid ${achievement.color}`,
                      height: "100%",
                    }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Typography variant="h3">{achievement.icon}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>
                              {achievement.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {achievement.description}
                            </Typography>
                          </Box>
                          <StarIcon sx={{ color: achievement.color }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "#6b7280" }}>
                🔒 In Progress ({lockedAchievements.length})
              </Typography>
              <Grid container spacing={2}>
                {lockedAchievements.map(achievement => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <Card sx={{ 
                      bgcolor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      height: "100%",
                    }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                          <Typography variant="h3" sx={{ opacity: 0.4 }}>
                            {achievement.icon}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: "#6b7280" }}>
                              {achievement.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {achievement.description}
                            </Typography>
                          </Box>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={achievement.progress} 
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: "#e5e7eb",
                            '& .MuiLinearProgress-bar': {
                              bgcolor: achievement.color,
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#9ca3af", mt: 0.5, display: "block" }}>
                          {achievement.progress.toFixed(0)}% complete
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

