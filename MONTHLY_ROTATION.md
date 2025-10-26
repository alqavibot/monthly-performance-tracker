# 📅 Monthly Data Rotation System

## Overview

The Monthly Performance Tracker now includes an **intelligent monthly data rotation system** that automatically manages your trading data while preserving historical analytics.

## 🔄 How It Works

### Three-Layer System

1. **Current Month** - Active trades being recorded daily
   - Real-time analytics (win rate, average RR, profit)
   - Full trade data with all details
   - Auto-updates as you trade

2. **Previous Month** - Last month's complete trade history
   - Full trade data preserved for detailed review
   - Allows comparison with current month
   - Available for analysis and export

3. **Archived Months** - Historical performance summaries
   - Comprehensive monthly statistics
   - Permanent storage of key metrics
   - No trade-level details (saves storage)

## 📈 Data Lifecycle

```
Current Month → Previous Month → Archived Summary
    (2025-10)        (2025-09)         (2025-08, 2025-07, ...)
```

### What Happens Each Month

1. **When a new month starts:**
   - Previous month → Archived as summary
   - Current month → Becomes previous month
   - New empty month → Becomes current month

2. **Automatic Process:**
   - Runs on first app load each month
   - No manual intervention needed
   - Data never lost

## 💾 What Gets Saved

### Current & Previous Months (Full Data)
- All trade entries (DATE/DAY, INSTRUMENT, ENTRY, EXIT, etc.)
- Risk management data
- Feedback and reasons
- Metadata (instrument changes, early exits, etc.)

### Archived Summaries (Statistics Only)
- Total trades count
- Win/Loss breakdown
- Win rate percentage
- Total profit/loss
- Average RR (Risk/Reward)
- Best trade
- Worst trade
- Expected risk setting
- Archive timestamp

## 🎯 Benefits

### ✅ Efficient Storage
- Only 2 months of raw trade data stored
- Older months compressed to summaries
- Fast load times even after years of trading

### ✅ Long-Term Analytics
- Year-over-year comparison possible
- Track performance trends
- Identify best/worst months
- Calculate yearly averages

### ✅ No Data Loss
- Important metrics preserved forever
- Can still evaluate past performance
- Monthly summaries remain accessible

### ✅ Automatic Management
- Zero maintenance required
- Runs seamlessly in background
- Works on Electron and Web versions

## 📊 Accessing Archives

Click the **"📅 Archive"** button in the toolbar to view:

1. **Current Month** - Active trades count and stats
2. **Previous Month** - Last month's full trade count
3. **Archived Months** - Historical summaries with:
   - Win rate and profit metrics
   - Best and worst trades
   - Performance indicators (color-coded)
   - Archive date

## 🔐 Data Integrity

- **Local-First**: All data saved locally (Electron or browser storage)
- **Cloud Sync**: Optional Firebase cloud backup
- **Version Migration**: Old data automatically upgraded to new format
- **Backward Compatible**: Works with existing accounts

## 📅 Year-End Analytics (Future Enhancement)

At year-end, all 12 monthly summaries can be combined to show:
- Total annual profit/loss
- Average win rate & RR across the year
- Best and weakest months
- Overall growth trajectory
- Consistency metrics

## 🛠️ Technical Details

### Data Structure

```javascript
{
  currentMonthKey: "2025-10",
  rows: [...],  // Current month trades
  expectedRisk: "100",
  previousMonthData: {
    monthKey: "2025-09",
    trades: [...],  // Previous month full data
    expectedRisk: "100"
  },
  monthlySummaries: {
    "2025-08": {
      monthKey: "2025-08",
      totalTrades: 45,
      wins: 28,
      losses: 17,
      winRate: 62.2,
      totalProfit: 1250.50,
      avgRR: 1.8,
      bestTrade: 150.00,
      worstTrade: -85.00,
      expectedRisk: "100",
      createdAt: "2025-09-01T00:00:00.000Z"
    }
  }
}
```

### Storage Locations

- **Electron**: `account_<name>.json` files in app data directory
- **Web**: Browser `localStorage` under `account_<name>` keys
- **Cloud**: Firebase Firestore `accounts` collection

### Rotation Logic

- Triggered on app load when `currentMonthKey !== getMonthKey()`
- Archives previous month using `generateMonthlySummary()`
- Moves current to previous slot
- Initializes fresh current month

## 🚀 Future Enhancements

- Yearly performance reports
- Multi-year comparison charts
- Export archived summaries to Excel
- Custom date range analytics
- Quarterly performance breakdown

---

**Note**: This feature works seamlessly with all existing features including Risk Validation, Feedback Reports, Analytics, and Achievements.

