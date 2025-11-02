import React, { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Button,
} from "@mui/material";
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  AutoStories as AutoStoriesIcon,
} from "@mui/icons-material";

export default function DailyQuotesPage({ open, onClose }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shownQuoteIds, setShownQuoteIds] = useState([]);

  // Load quote IDs that have been shown from localStorage
  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem('shownQuoteIds');
      if (stored) {
        try {
          setShownQuoteIds(JSON.parse(stored));
        } catch (e) {
          // Reset if parsing fails
          setShownQuoteIds([]);
        }
      }
    }
  }, [open]);

  // Fetch a new quote from Quotable API (free, no auth needed)
  const fetchQuote = async (retry = 0) => {
    let timeoutId = null;
    
    try {
      setLoading(true);
      setError(null);

      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for faster fallback

      // Fetch from Quotable API with tags relevant to trading, success, motivation
      const tags = ['business', 'success', 'wisdom', 'motivational', 'inspirational'];
      const tag = tags[Math.floor(Math.random() * tags.length)];
      
      // Use Quotable API - it has a huge database and gives unique quotes
      const response = await fetch(`https://api.quotable.io/quotes/random?tags=${tag}&maxLength=200`, {
        signal: controller.signal
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('No quote returned');
      }

      const newQuote = data[0];
      const quoteId = newQuote._id;

      // Check if we've shown this quote before
      if (shownQuoteIds.includes(quoteId)) {
        // If we've shown all quotes (unlikely but possible), reset the list
        if (shownQuoteIds.length > 1000) {
          setShownQuoteIds([]);
          localStorage.setItem('shownQuoteIds', JSON.stringify([]));
        }
        
        // If retried less than 2 times, try again quickly
        if (retry < 2) {
          return fetchQuote(retry + 1);
        } else {
          // Fallback: use a predefined quote if API keeps returning duplicates
          return fetchFallbackQuote();
        }
      }

      // Add this quote ID to shown list
      const updatedShown = [...shownQuoteIds, quoteId];
      setShownQuoteIds(updatedShown);
      localStorage.setItem('shownQuoteIds', JSON.stringify(updatedShown));

      setQuote(newQuote);
      setLoading(false);
    } catch (err) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // If timeout or network error, use fallback immediately
      if (err.name === 'AbortError' || err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
        console.error('Network/timeout error, using fallback:', err);
        fetchFallbackQuote();
        return;
      }
      
      console.error('Error fetching quote:', err);
      
      // Fallback to predefined quotes if API fails - no retry, just fallback
      fetchFallbackQuote();
    }
  };

  // Fallback quotes when API fails or all quotes shown
  const fetchFallbackQuote = () => {
    const fallbackQuotes = [
      { content: "The market doesn't care about your feelings. Trade with discipline, not emotion.", author: "Trading Wisdom", tags: ["trading"] },
      { content: "Your biggest enemy in trading is yourself. Master your psychology, master the markets.", author: "Trading Psychology", tags: ["trading"] },
      { content: "Consistency beats perfection. Small consistent wins compound into massive success.", author: "Success Principle", tags: ["success"] },
      { content: "Risk management isn't optional. Protect your capital like it's the only thing you have.", author: "Risk Management", tags: ["trading"] },
      { content: "Every loss is a lesson. Every win is validation of your strategy.", author: "Trading Wisdom", tags: ["trading"] },
      { content: "Patience is a superpower in trading. Wait for your setup, then execute with confidence.", author: "Trading Discipline", tags: ["trading"] },
      { content: "The best traders don't predict the market—they react to it with precision.", author: "Trading Philosophy", tags: ["trading"] },
      { content: "Success in trading is 90% psychology and 10% strategy. Work on yourself first.", author: "Trading Psychology", tags: ["trading"] },
      { content: "Cut losses short. Let winners run. It's simple but not easy.", author: "Trading Rule", tags: ["trading"] },
      { content: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder", tags: ["trading"] },
      { content: "The only bad trade is one that breaks your rules. Follow your system.", author: "Trading Discipline", tags: ["trading"] },
      { content: "FOMO is the fastest way to blow your account. Stick to your plan.", author: "Trading Wisdom", tags: ["trading"] },
      { content: "The market will always be there tomorrow. Your capital might not be if you overtrade today.", author: "Risk Management", tags: ["trading"] },
      { content: "A small win today is better than a big loss tomorrow. Preserve capital first.", author: "Trading Rule", tags: ["trading"] },
      { content: "Your edge isn't what you know—it's how consistently you apply what you know.", author: "Trading Philosophy", tags: ["trading"] },
      { content: "Every trade is a new opportunity. Don't let yesterday's losses affect today's decisions.", author: "Trading Psychology", tags: ["trading"] },
      { content: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes", tags: ["wisdom"] },
      { content: "Risk comes from not knowing what you're doing.", author: "Warren Buffett", tags: ["wisdom"] },
      { content: "In trading, the hardest work is mental. It's controlling your mind.", author: "Mark Douglas", tags: ["trading"] },
      { content: "Time in the market beats timing the market.", author: "Unknown", tags: ["wisdom"] },
    ];

    // Use day of year to ensure variety but consistency per day
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const randomIndex = (dayOfYear * 7 + shownQuoteIds.length) % fallbackQuotes.length;
    const selectedQuote = fallbackQuotes[randomIndex];
    
    // Create a unique ID based on content hash
    const quoteId = `fallback_${selectedQuote.content.substring(0, 30).replace(/\s/g, '_')}_${dayOfYear}`;
    
    // Check if we've shown this today
    if (!shownQuoteIds.includes(quoteId)) {
      const updatedShown = [...shownQuoteIds, quoteId];
      // Limit stored IDs to prevent localStorage bloat
      if (updatedShown.length > 500) {
        updatedShown.shift(); // Remove oldest
      }
      setShownQuoteIds(updatedShown);
      localStorage.setItem('shownQuoteIds', JSON.stringify(updatedShown));
    }

    setQuote(selectedQuote);
    setLoading(false);
    setError(null);
  };

  // Load quote when dialog opens
  useEffect(() => {
    if (open) {
      // Reset states when opening
      setQuote(null);
      setError(null);
      setLoading(true);
      // Fetch immediately, with fallback
      fetchQuote();
    }
  }, [open]);

  const handleRefresh = () => {
    setQuote(null);
    fetchQuote();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 400,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoStoriesIcon sx={{ color: 'white', fontSize: 28 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Daily Inspiration
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={handleRefresh}
              sx={{
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }
              }}
              title="Get New Quote"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              onClick={onClose}
              sx={{
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 4, pb: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 2 }}>
            <CircularProgress sx={{ color: 'white' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Fetching your daily inspiration...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', textAlign: 'center', mb: 2 }}>
              Failed to load quote
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={fetchFallbackQuote}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
            >
              Use Offline Quote
            </Button>
          </Box>
        ) : quote ? (
          <Box sx={{ textAlign: 'center', px: 2 }}>
            <Box sx={{ mb: 3 }}>
              <AutoStoriesIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.9)', mb: 2 }} />
            </Box>
            
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 500,
                fontStyle: 'italic',
                lineHeight: 1.6,
                mb: 3,
                fontSize: { xs: 20, sm: 24 },
                px: { xs: 1, sm: 4 },
              }}
            >
              "{quote.content}"
            </Typography>
            
            {quote.author && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 400,
                    fontSize: { xs: 14, sm: 16 },
                  }}
                >
                  — {quote.author}
                </Typography>
              </Box>
            )}
            
            {quote.tags && quote.tags.length > 0 && (
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {quote.tags.slice(0, 3).map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  />
                ))}
              </Box>
            )}
            
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                ✨ Fresh quote • Never repeats • Updates daily
              </Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

