# 📊 Complete Data Handling Overview
## Monthly Performance Tracker Application

---

## 🗂️ **1. STORAGE MECHANISMS**

The application uses a **3-tier storage strategy** for maximum reliability and offline support:

### **Tier 1: Local File System (Electron Desktop App)**
- **Location**: `~/.monthly-perf-tracker/` (user's home directory)
- **Format**: JSON files, one per account
- **File Naming**: `account_{SectionName}_{AccountName}.json`
  - Example: `account_Funded_Accounts_GBPJPY.json`
- **API**: Electron preload exposes `window.electronAPI`
  - `readLocalFile(fileName)` - Reads JSON file
  - `writeLocalFile(fileName, data)` - Writes JSON file
  - `getUserDataPath()` - Returns storage path
- **Priority**: **Highest** - Always checked first when loading

### **Tier 2: Browser localStorage (Web Version)**
- **Location**: Browser's localStorage
- **Key Format**: `account_{AccountKey}`
  - Example: `account_Funded Accounts/GBPJPY`
- **Format**: JSON stringified data
- **Priority**: **Medium** - Used when Electron is not available

### **Tier 3: Firebase Firestore (Cloud Backup)**
- **Collection**: `accounts`
- **Document ID**: URL-encoded account key
  - Example: `Funded%20Accounts%2FGBPJPY`
- **Structure**: Full account data object
- **Persistence**: Enabled (IndexedDB cache for offline)
- **Priority**: **Lowest** - Fallback when local data unavailable

---

## 📋 **2. DATA STRUCTURE**

### **Account Data Object Structure**

```javascript
{
  // Current month tracking
  currentMonthKey: "2025-10",           // Format: YYYY-MM
  rows: [...],                          // Array of trade rows (current month)
  expectedRisk: "2.50",                 // Expected risk per trade
  
  // Previous month (full data preserved)
  previousMonthData: {
    monthKey: "2025-09",
    trades: [...],                      // Full array of trade rows
    expectedRisk: "2.50"
  },
  
  // Archived months (summary only)
  monthlySummaries: {
    "2025-08": {
      monthKey: "2025-08",
      totalTrades: 25,
      wins: 15,
      losses: 10,
      winRate: 60.0,
      totalProfit: 125.50,
      avgRR: 1.5,
      bestTrade: 25.00,
      worstTrade: -15.00,
      expectedRisk: "2.50",
      createdAt: "2025-09-01T00:00:00.000Z"
    },
    "2025-07": { ... }
  },
  
  // Risk management settings
  riskSettings: {
    initialCapital: 200,
    currentCapital: 225.50,
    baseTrades: 6,
    milestoneCapital: 200,
    tradesAtMilestone: 6,
    riskPerTrade: 2.5
  }
}
```

### **Trade Row Structure**

Each trade row contains:
- **Visible Columns**: All columns from schema.json (DATE/DAY, INTRUMENT, P/L, RISK, etc.)
- **Metadata Fields** (hidden, prefixed with `_`):
  - `_id`: Unique UUID for the row
  - `_instrumentReason`: Reason for instrument mismatch
  - `_riskMismatchReason`: Reason for risk mismatch
  - `_overRiskReason`: Reason for over-risking
  - `_earlyExitReason`: Reason for early exit

### **Account List Structure (Firebase)**

```javascript
// Collection: accountLists, Document: lists
{
  fundedAccounts: ["GBPJPY", "EURUSD", "GOLD"],
  ownAccounts: ["GOLD1", "GOLD2", "BTCUSD"]
}
```

---

## 🔄 **3. DATA RETRIEVAL (LOADING)**

### **Load Sequence (Priority Order)**

When an account is opened, the application follows this sequence:

```
1. Check Electron Local Files
   ├─ File: ~/.monthly-perf-tracker/account_{key}.json
   └─ If found → Parse JSON → Load data ✅
   
2. Check Browser localStorage
   ├─ Key: account_{accountKey}
   └─ If found → Parse JSON → Load data ✅
   
3. Check Firebase Firestore
   ├─ Collection: accounts
   ├─ Document: URL-encoded account key
   └─ If found → Load data ✅
   
4. No data found
   └─ Create fresh account with current month
```

### **Load Process Details**

**Location**: `AccountPage.jsx` - `useEffect` hook (lines 598-717)

**Steps**:
1. **Reset state**: `setLoaded(false)`, clear expected risk
2. **Try local storage**:
   - Electron: `window.electronAPI.readLocalFile()`
   - Browser: `localStorage.getItem()`
3. **Try Firebase** (if local not found):
   - `doc(db, "accounts", encodeURIComponent(key))`
   - `getDoc(ref)` - Fetch document
4. **Data migration** (if old format):
   - Old: Array of rows → Convert to new structure
   - Intermediate: Has rows but no month tracking → Add month tracking
   - New: Full structure → Load directly
5. **Month rotation check**:
   - If `currentMonthKey !== getMonthKey()` → Perform rotation
   - Move current → previous, previous → archived
6. **Set state**: Load all data into React state
7. **Initialize tracking**: Set `lastSavedData` for change detection

---

## 💾 **4. DATA SAVING (STORING/UPDATING)**

### **Auto-Save Mechanism**

**Location**: `AccountPage.jsx` - `useEffect` hook (lines 703-814)

**Trigger**: Any change to:
- `rows` (trade data)
- `expectedRisk`
- `currentMonthKey`
- `previousMonthData`
- `monthlySummaries`
- `riskSettings`

**Save Strategy**: **Local Storage ONLY** (not Firebase)
- Debounce: 500ms delay
- Prevents excessive writes
- Fast and reliable

**Process**:
```javascript
1. Detect change in tracked state variables
2. Wait 500ms (debounce)
3. Build data object with all current state
4. Save to local storage:
   - Electron: window.electronAPI.writeLocalFile()
   - Browser: localStorage.setItem()
5. Log success/warning
```

### **Manual Firebase Sync**

**Location**: `AccountPage.jsx` - Various save functions

**When triggered**:
- User clicks "Save to Firebase" button
- Account rename operation
- Critical operations requiring cloud backup

**Process**:
```javascript
1. Build current data object
2. Get Firebase document reference
3. setDoc(ref, data, { merge: true })
4. Also save to local storage (for consistency)
```

### **Account List Saving**

**Location**: `Dashboard.jsx` - `useEffect` hook (lines 80-97)

**Trigger**: Changes to `fundedAccounts` or `ownAccounts`

**Process**:
```javascript
1. Get Firebase reference: doc(db, "accountLists", "lists")
2. setDoc(ref, { fundedAccounts, ownAccounts })
3. Auto-saves on every change
```

---

## 🗑️ **5. DATA DELETION**

### **Account Deletion**

**Location**: `Dashboard.jsx` - `handleDeleteAccount()` (lines 113-136)

**Process**:
```javascript
1. Remove from local state array (fundedAccounts or ownAccounts)
2. Close account if currently open
3. Delete Firebase document:
   - doc(db, "accounts", encodeURIComponent(accountKey))
   - deleteDoc(docRef)
4. Account list auto-saves (removed account not included)
```

**What gets deleted**:
- ✅ Account document from Firebase
- ✅ Account removed from account list
- ⚠️ **Local file NOT deleted** (stays in Electron storage)
  - This is intentional - allows recovery if needed

### **Trade Row Deletion**

**Location**: `AccountPage.jsx` - Table delete button

**Process**:
```javascript
1. User clicks delete button on a row
2. Filter rows array: rows.filter(r => r._id !== id)
3. Auto-save triggered (removes row from storage)
4. No explicit Firebase sync needed (handled by auto-save)
```

### **Account Rename (Data Migration)**

**Location**: `Dashboard.jsx` - `handleRenameAccount()` (lines 138-203)

**Process**:
```javascript
1. Fetch old account data from Firebase
2. Create new document with new account key
3. Copy all data to new document
4. Delete old document
5. Update account list (replace old name with new)
6. Update activeAccount state
7. Save account list to Firebase
```

---

## 📅 **6. MONTHLY ROTATION & ARCHIVING**

### **Month Detection**

**Location**: `AccountPage.jsx` - `getMonthKey()` (lines 174-178)

**Format**: `"YYYY-MM"` (e.g., "2025-10")

**When checked**: On every account load

### **Rotation Process**

**Location**: `AccountPage.jsx` - `performMonthRotation()` (lines 248-287)

**Trigger**: When `currentMonthKey !== getMonthKey()`

**Steps**:

```
Step 1: Archive Previous Month
├─ If previousMonthData exists
├─ Generate summary from trades
│  ├─ Calculate: wins, losses, winRate, totalProfit, avgRR, bestTrade, worstTrade
│  └─ Store in monthlySummaries[monthKey]
└─ Previous month data converted to summary only

Step 2: Move Current → Previous
├─ Copy current month rows to previousMonthData.trades
├─ Copy expectedRisk to previousMonthData.expectedRisk
├─ Store monthKey in previousMonthData.monthKey
└─ Full trade data preserved (available for download)

Step 3: Start New Month
├─ Set currentMonthKey = getMonthKey() (new month)
├─ Set rows = [emptyRow()] (one blank row)
└─ Keep expectedRisk value
```

### **Summary Generation**

**Location**: `AccountPage.jsx` - `generateMonthlySummary()` (lines 181-243)

**Process**:
```javascript
1. Calculate statistics from trades array:
   - wins: Count of P/L > 0
   - losses: Count of P/L < 0
   - winRate: (wins / total) * 100
   - totalProfit: Sum of all P/L
   - avgRR: Average Risk/Reward
   - bestTrade: Maximum P/L
   - worstTrade: Minimum P/L

2. Create summary object:
   {
     monthKey,
     totalTrades,
     wins,
     losses,
     winRate,
     totalProfit,
     avgRR,
     bestTrade,
     worstTrade,
     expectedRisk,
     createdAt: new Date().toISOString()
   }

3. Store in monthlySummaries object
```

**Important**: Once archived, **full trade data is NOT preserved** - only summary statistics remain.

---

## 👥 **7. ACCOUNT MANAGEMENT**

### **Account List Structure**

**Storage**: Firebase `accountLists` collection, document `lists`

```javascript
{
  fundedAccounts: ["GBPJPY", "EURUSD", "GOLD"],
  ownAccounts: ["GOLD1", "GOLD2"]
}
```

### **Adding Account**

**Location**: `Dashboard.jsx` - `handleAddAccount()` (lines 101-111)

**Process**:
```javascript
1. User enters account name in dialog
2. Add to appropriate array (fundedAccounts or ownAccounts)
3. Account list auto-saves to Firebase
4. New account appears in sidebar
5. When opened, creates fresh account data
```

### **Deleting Account**

See **Section 5: DATA DELETION** above.

### **Renaming Account**

See **Section 5: DATA DELETION** above (Account Rename section).

---

## 🔄 **8. DATA FLOW DIAGRAM**

### **Complete Data Lifecycle**

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION STARTUP                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              LOAD ACCOUNT LIST (Dashboard.jsx)               │
│  1. Check Firebase: accountLists/lists                       │
│  2. If not found → Create default accounts                    │
│  3. Display in sidebar                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            USER OPENS ACCOUNT (AccountPage.jsx)              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │    DATA RETRIEVAL (Priority)        │
         ├─────────────────────────────────────┤
         │ 1. Electron Local File              │ ✅ FOUND
         │ 2. Browser localStorage             │ ✅ FOUND
         │ 3. Firebase Firestore                │ ✅ FOUND
         │ 4. None → Create Fresh               │
         └─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA PROCESSING & MIGRATION                     │
│  • Check data format (old → new migration)                  │
│  • Check month rotation needed                                │
│  • Perform rotation if month changed                         │
│  • Set React state                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  USER INTERACTION                            │
│  • Add/edit/delete trades                                    │
│  • Modify risk settings                                      │
│  • View analytics                                            │
│  • Download Excel exports                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AUTO-SAVE (500ms debounce)                      │
│  • Save to local storage (Electron or Browser)              │
│  • Fast and reliable                                         │
│  • No Firebase sync (unless manual)                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              MONTH END ROTATION (Auto-detect)                 │
│  When month changes on next load:                            │
│  1. Archive previous month → summary                         │
│  2. Move current → previous (full data)                       │
│  3. Start new month                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ **9. STORAGE LOCATIONS SUMMARY**

### **Desktop App (Electron)**
- **Files**: `~/.monthly-perf-tracker/account_*.json`
- **Purpose**: Primary storage, fast access
- **Format**: JSON files

### **Web App (Browser)**
- **Storage**: `localStorage.getItem('account_*')`
- **Purpose**: Primary storage when Electron unavailable
- **Format**: JSON strings in localStorage

### **Firebase Firestore**
- **Collection**: `accounts`
- **Document ID**: URL-encoded account key
- **Purpose**: Cloud backup, multi-device sync
- **Persistence**: IndexedDB cache enabled

### **Firebase Firestore (Account Lists)**
- **Collection**: `accountLists`
- **Document ID**: `lists`
- **Purpose**: Store account names by category
- **Sync**: Auto-saves on changes

---

## 🔐 **10. DATA INTEGRITY & SAFETY**

### **Data Protection Mechanisms**

1. **Migration Support**: Automatically migrates old data formats to new structure
2. **Debouncing**: 500ms delay prevents excessive writes
3. **Error Handling**: Try-catch blocks prevent crashes on storage failures
4. **Offline Support**: Works without internet (local storage + Firebase cache)
5. **Fallback Chain**: Local → localStorage → Firebase (always has data source)

### **Data Loss Prevention**

- ✅ Auto-save on every change (500ms delay)
- ✅ Local storage always prioritized (faster, more reliable)
- ✅ Firebase backup available
- ✅ Month rotation preserves data (previous month full data kept)
- ⚠️ Archived months lose full trade data (summary only)

---

## 📊 **11. DATA USAGE SCENARIOS**

### **Scenario 1: First Time Opening Account**
```
1. No local data found
2. No Firebase data found
3. Create fresh account:
   - currentMonthKey = current month
   - rows = [emptyRow()]
   - expectedRisk = ""
   - previousMonthData = null
   - monthlySummaries = {}
```

### **Scenario 2: Opening Existing Account**
```
1. Load from local storage ✅
2. Check month rotation (if needed)
3. Display current month trades
4. Show previous month (if exists)
5. Show archived months (if any)
```

### **Scenario 3: Month Changes**
```
1. User opens app after month boundary
2. System detects currentMonthKey != getMonthKey()
3. Perform rotation:
   - Previous month → archived (summary only)
   - Current month → previous (full data)
   - New month → current (fresh)
4. Save all changes
5. Previous month now available for Excel download
```

### **Scenario 4: Adding Trade**
```
1. User types in table cell
2. updateCell() updates row in state
3. State change triggers auto-save (500ms delay)
4. Data saved to local storage
5. User can continue working immediately
```

### **Scenario 5: Deleting Account**
```
1. Remove from account list state
2. Delete Firebase document
3. Close account if open
4. Local file remains (recovery possible)
5. Account list auto-saves
```

---

## 🎯 **12. KEY DESIGN DECISIONS**

1. **Local-First**: Local storage always checked first for speed
2. **Auto-Save Only Local**: Firebase sync is manual (prevents quota issues)
3. **Previous Month Full Data**: Keeps full trades for download opportunity
4. **Archived Months Summary Only**: Saves storage space for old data
5. **Migration-Friendly**: Handles old data formats gracefully
6. **Offline-Capable**: Works without internet connection

---

## 📝 **13. FILE NAMING CONVENTIONS**

### **Electron Local Files**
- **Format**: `account_{SectionName}_{AccountName}.json`
- **Sanitization**: `/[\\/: ]/g` replaced with `_`
- **Example**: `account_Funded_Accounts_GBPJPY.json`

### **localStorage Keys**
- **Format**: `account_{AccountKey}`
- **Example**: `account_Funded Accounts/GBPJPY`

### **Firebase Document IDs**
- **Format**: URL-encoded account key
- **Example**: `Funded%20Accounts%2FGBPJPY`

---

## 🔧 **14. MAINTENANCE OPERATIONS**

### **Monthly Rotation (Automatic)**
- Triggered on account load when month changes
- Converts previous month to summary
- Moves current month to previous (full data)
- Starts fresh current month

### **Data Migration (Automatic)**
- Detects old data formats
- Migrates to new structure automatically
- Preserves all existing data

### **Cleanup (Manual)**
- No automatic cleanup of old data
- Archived summaries kept indefinitely
- Local files persist until manually deleted
- Firebase documents persist until manually deleted

---

This comprehensive overview covers all aspects of data handling in the Monthly Performance Tracker application!

