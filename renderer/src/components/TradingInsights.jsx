import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  Divider,
  LinearProgress,
  Avatar,
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PsychologyIcon from "@mui/icons-material/Psychology";
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

export default function TradingInsights({ rows }) {
  const { mode } = useThemeMode();
  const insights = useMemo(() => {
    const validTrades = rows.filter(row => {
      const plValue = parseFloat(row["P/L"]);
      return !isNaN(plValue);
    });

    if (validTrades.length < 5) {
      return {
        insufficientData: true,
        patterns: [],
        suggestions: [],
      };
    }

    const patterns = [];
    const suggestions = [];
    const warnings = [];

    // Separate wins and losses
    const wins = validTrades.filter(r => parseFloat(r["P/L"]) > 0);
    const losses = validTrades.filter(r => parseFloat(r["P/L"]) < 0);
    const winRate = validTrades.length > 0 ? (wins.length / validTrades.length) * 100 : 0;

    // 1. PATTERN: Over-risked trades correlation
    const overRiskedTrades = validTrades.filter(r => {
      const overRisk = (r["OVER RISKED ?"] || "").toUpperCase().trim();
      return overRisk === "YES" || overRisk === "Y";
    });
    
    const overRiskedLosses = overRiskedTrades.filter(r => parseFloat(r["P/L"]) < 0);
    
    if (overRiskedTrades.length >= 3) {
      const lossRate = (overRiskedLosses.length / overRiskedTrades.length) * 100;
      patterns.push({
        id: "over_risk",
        type: "warning",
        title: "Over-Risking Pattern Detected",
        description: `${overRiskedTrades.length} trades marked as over-risked, with ${lossRate.toFixed(0)}% resulting in losses.`,
        severity: "high",
        icon: "⚠️",
      });
      
      suggestions.push({
        id: "reduce_risk",
        title: "Reduce Your Risk Per Trade",
        description: "Stick to your planned risk amount. Over-risking often leads to emotional decisions and bigger losses.",
        action: "Set strict risk limits and use position size calculators before entering trades.",
        priority: "high",
      });
    }

    // 2. PATTERN: Early exits analysis
    const earlyExits = validTrades.filter(r => {
      const earlyExit = (r["EARLY EXIT ?"] || "").toUpperCase().trim();
      return earlyExit === "YES" || earlyExit === "Y";
    });
    
    const earlyExitWins = earlyExits.filter(r => parseFloat(r["P/L"]) > 0);
    
    if (earlyExits.length >= 3) {
      patterns.push({
        id: "early_exit",
        type: "info",
        title: "Frequent Early Exits",
        description: `${earlyExits.length} trades closed early. ${earlyExitWins.length} were still profitable.`,
        severity: "medium",
        icon: "⏱️",
      });
      
      if (earlyExitWins.length >= 2) {
        suggestions.push({
          id: "trust_analysis",
          title: "Trust Your Analysis",
          description: "You're exiting trades early even when they're profitable. This limits your profit potential.",
          action: "Set clear profit targets and stick to them. Use trailing stops instead of manual exits.",
          priority: "medium",
        });
      }
    }

    // 3. PATTERN: Instrument performance
    const instrumentStats = new Map();
    validTrades.forEach(row => {
      const instrument = (row["INTRUMENT"] || "").trim().toUpperCase();
      const plValue = parseFloat(row["P/L"]);
      
      if (!instrument) return;
      
      if (!instrumentStats.has(instrument)) {
        instrumentStats.set(instrument, { wins: 0, losses: 0, total: 0, netPL: 0 });
      }
      
      const stats = instrumentStats.get(instrument);
      stats.total += 1;
      stats.netPL += plValue;
      
      if (plValue > 0) stats.wins += 1;
      else stats.losses += 1;
    });

    // Find worst performing instrument
    let worstInstrument = null;
    let worstPL = 0;
    instrumentStats.forEach((stats, instrument) => {
      if (stats.total >= 3 && stats.netPL < worstPL) {
        worstPL = stats.netPL;
        worstInstrument = { name: instrument, ...stats };
      }
    });

    if (worstInstrument) {
      patterns.push({
        id: "bad_instrument",
        type: "warning",
        title: `Struggling with ${worstInstrument.name}`,
        description: `${worstInstrument.losses} losses vs ${worstInstrument.wins} wins. Net: $${worstInstrument.netPL.toFixed(2)}`,
        severity: "high",
        icon: "📉",
      });
      
      suggestions.push({
        id: "avoid_instrument",
        title: `Consider Avoiding ${worstInstrument.name}`,
        description: `This instrument has consistently resulted in losses for you. Focus on instruments where you perform better.`,
        action: `Take a break from ${worstInstrument.name} or spend more time studying its price action before trading it again.`,
        priority: "high",
      });
    }

    // Find best performing instrument
    let bestInstrument = null;
    let bestPL = 0;
    instrumentStats.forEach((stats, instrument) => {
      if (stats.total >= 3 && stats.netPL > bestPL) {
        bestPL = stats.netPL;
        bestInstrument = { name: instrument, ...stats };
      }
    });

    if (bestInstrument && bestPL > 0) {
      patterns.push({
        id: "good_instrument",
        type: "success",
        title: `Strong Performance on ${bestInstrument.name}`,
        description: `${bestInstrument.wins} wins vs ${bestInstrument.losses} losses. Net: $${bestInstrument.netPL.toFixed(2)}`,
        severity: "low",
        icon: "✅",
      });
      
      suggestions.push({
        id: "focus_instrument",
        title: `Focus More on ${bestInstrument.name}`,
        description: `You have a proven track record with this instrument. Consider increasing your exposure here.`,
        action: `Study what makes your ${bestInstrument.name} trades successful and replicate that approach.`,
        priority: "low",
      });
    }

    // 4. PATTERN: Win rate analysis
    if (winRate < 40 && validTrades.length >= 10) {
      patterns.push({
        id: "low_winrate",
        type: "warning",
        title: "Low Win Rate",
        description: `Current win rate: ${winRate.toFixed(1)}%. This suggests issues with entry timing or strategy.`,
        severity: "high",
        icon: "📊",
      });
      
      suggestions.push({
        id: "improve_entries",
        title: "Improve Your Entry Strategy",
        description: "A win rate below 40% indicates systematic issues with trade selection or timing.",
        action: "Review your entry criteria. Wait for stronger confirmations before entering trades. Consider journaling why each trade was taken.",
        priority: "high",
      });
    } else if (winRate >= 60 && validTrades.length >= 10) {
      patterns.push({
        id: "good_winrate",
        type: "success",
        title: "Solid Win Rate",
        description: `Win rate: ${winRate.toFixed(1)}%. You're selecting good trades consistently.`,
        severity: "low",
        icon: "🎯",
      });
    }

    // 5. PATTERN: Loss streaks
    let maxLossStreak = 0;
    let currentStreak = 0;
    
    validTrades.sort((a, b) => {
      const dateA = parseTradeDate(a["DATE/DAY"]);
      const dateB = parseTradeDate(b["DATE/DAY"]);
      return dateA - dateB;
    }).forEach(row => {
      const plValue = parseFloat(row["P/L"]);
      if (plValue < 0) {
        currentStreak++;
        if (currentStreak > maxLossStreak) {
          maxLossStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    });

    if (maxLossStreak >= 4) {
      patterns.push({
        id: "loss_streak",
        type: "warning",
        title: "Significant Loss Streak Detected",
        description: `Longest loss streak: ${maxLossStreak} trades in a row.`,
        severity: "medium",
        icon: "🔴",
      });
      
      suggestions.push({
        id: "break_after_losses",
        title: "Take Breaks After Consecutive Losses",
        description: "Long loss streaks often indicate emotional trading or forcing trades.",
        action: "After 2-3 consecutive losses, step away from the charts. Review your strategy before continuing.",
        priority: "high",
      });
    }

    // 6. PATTERN: Most common loss reasons
    const lossFeedback = losses.map(r => r["FEEDBACK"]).filter(Boolean);
    const feedbackCounts = {};
    
    lossFeedback.forEach(feedback => {
      const normalized = feedback.toLowerCase().trim();
      feedbackCounts[normalized] = (feedbackCounts[normalized] || 0) + 1;
    });

    const topLossReasons = Object.entries(feedbackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topLossReasons.length > 0 && topLossReasons[0][1] >= 3) {
      patterns.push({
        id: "common_mistake",
        type: "warning",
        title: "Recurring Mistake Pattern",
        description: `"${topLossReasons[0][0]}" appears in ${topLossReasons[0][1]} losing trades.`,
        severity: "high",
        icon: "🔁",
      });
      
      suggestions.push({
        id: "fix_recurring",
        title: "Address Your Most Common Mistake",
        description: `You keep making the same mistake: "${topLossReasons[0][0]}". This is your biggest area for improvement.`,
        action: "Create a specific rule to avoid this mistake. Put a sticky note on your monitor as a reminder before each trade.",
        priority: "high",
      });
    }

    // 7. PATTERN: Risk/Reward ratio
    const avgWin = wins.length > 0 ? wins.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, r) => sum + parseFloat(r["P/L"]), 0) / losses.length) : 0;
    const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    if (rrRatio < 1.5 && validTrades.length >= 10) {
      patterns.push({
        id: "poor_rr",
        type: "warning",
        title: "Poor Risk/Reward Ratio",
        description: `Average win ($${avgWin.toFixed(2)}) is only ${rrRatio.toFixed(2)}x your average loss ($${avgLoss.toFixed(2)}).`,
        severity: "medium",
        icon: "⚖️",
      });
      
      suggestions.push({
        id: "improve_rr",
        title: "Target Higher Risk/Reward Ratios",
        description: "Your wins aren't big enough compared to your losses. Aim for at least 2:1 risk/reward on each trade.",
        action: "Before entering a trade, ensure your profit target is at least 2x your stop loss distance.",
        priority: "medium",
      });
    } else if (rrRatio >= 2 && validTrades.length >= 10) {
      patterns.push({
        id: "good_rr",
        type: "success",
        title: "Excellent Risk/Reward Management",
        description: `Your average win is ${rrRatio.toFixed(2)}x your average loss. Great job!`,
        severity: "low",
        icon: "💎",
      });
    }

    // Sort by priority
    const sortedSuggestions = suggestions.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });

    return {
      insufficientData: false,
      patterns,
      suggestions: sortedSuggestions,
      warnings,
      stats: {
        totalTrades: validTrades.length,
        winRate,
        avgWin,
        avgLoss,
        rrRatio,
      }
    };
  }, [rows]);

  if (insights.insufficientData) {
    return (
      <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <PsychologyIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI-Powered Trading Insights
            </Typography>
          </Stack>
          <Alert severity="info">
            <Typography variant="body2">
              Not enough data yet. Complete at least 5 trades with P/L amounts to get personalized insights and pattern recognition.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <PsychologyIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI-Powered Trading Insights
            </Typography>
            <Chip 
              label={`${insights.patterns.length} patterns`}
              size="small"
              sx={{ bgcolor: "rgba(99, 102, 241, 0.1)", color: "#6366f1", fontWeight: 600 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Based on analysis of {insights.stats.totalTrades} trades
          </Typography>
        </CardContent>
      </Card>

      {/* Pattern Recognition */}
      <Card sx={{ mb: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <WarningAmberIcon sx={{ color: "#f59e0b", fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
              Detected Patterns
            </Typography>
          </Stack>

          {insights.patterns.length === 0 ? (
            <Alert severity="success">
              <Typography variant="body2">
                No concerning patterns detected. Keep up the good work!
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={2}>
              {insights.patterns.map(pattern => (
                <Alert 
                  key={pattern.id}
                  severity={
                    pattern.type === "warning" ? "warning" :
                    pattern.type === "success" ? "success" : "info"
                  }
                  icon={<Typography sx={{ fontSize: 20 }}>{pattern.icon}</Typography>}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {pattern.title}
                  </Typography>
                  <Typography variant="body2">
                    {pattern.description}
                  </Typography>
                </Alert>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Personalized Suggestions */}
      <Card sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <LightbulbIcon sx={{ color: "#fbbf24", fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
              Personalized Suggestions
            </Typography>
          </Stack>

          {insights.suggestions.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                No specific suggestions at this time. Continue trading and we'll provide insights as patterns emerge.
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={2}>
              {insights.suggestions.map((suggestion, index) => (
                <Card 
                  key={suggestion.id}
                  sx={{ 
                    bgcolor: suggestion.priority === "high" ? "rgba(239, 68, 68, 0.05)" :
                             suggestion.priority === "medium" ? "rgba(251, 191, 36, 0.05)" :
                             "rgba(34, 197, 94, 0.05)",
                    border: `2px solid ${
                      suggestion.priority === "high" ? "#fca5a5" :
                      suggestion.priority === "medium" ? "#fcd34d" :
                      "#86efac"
                    }`
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, flex: 1 }}>
                        {index + 1}. {suggestion.title}
                      </Typography>
                      <Chip 
                        label={suggestion.priority}
                        size="small"
                        sx={{ 
                          bgcolor: suggestion.priority === "high" ? "#ef4444" :
                                   suggestion.priority === "medium" ? "#fbbf24" :
                                   "#22c55e",
                          color: "white",
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                      {suggestion.description}
                    </Typography>
                    <Box sx={{ 
                      p: 1.5, 
                      bgcolor: "rgba(99, 102, 241, 0.05)", 
                      borderRadius: 1,
                      borderLeft: "3px solid #6366f1",
                      mt: 1,
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "#6366f1", display: "block", mb: 0.5 }}>
                        ACTION STEP:
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>
                        {suggestion.action}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

