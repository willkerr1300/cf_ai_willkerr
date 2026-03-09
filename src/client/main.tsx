import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", color: "#e4e4e7", fontFamily: "monospace" }}>
          <h2 style={{ color: "#f97316", marginBottom: "1rem" }}>App Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#f87171" }}>
            {(this.state.error as Error).message}
            {"\n\n"}
            {(this.state.error as Error).stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
