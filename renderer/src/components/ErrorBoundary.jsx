import React from "react";
import { Box, Typography, Button } from "@mui/material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", p: 3, bgcolor: "background.default" }}>
          <Box sx={{ textAlign: "center", maxWidth: 600 }}>
            <Typography variant="h5" sx={{ mb: 2, color: "error.main" }}>
              ⚠️ Something Went Wrong
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
              The application encountered an unexpected error. Please refresh the page or check the console for details.
            </Typography>
            {this.state.error && (
              <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1, fontFamily: "monospace", fontSize: 12, overflow: "auto", maxHeight: 200 }}>
                {this.state.error.toString()}
              </Typography>
            )}
            <Button 
              variant="contained" 
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              sx={{ mr: 1 }}
            >
              Reload Page
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
              }}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

