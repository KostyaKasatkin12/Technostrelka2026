import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { hasError: boolean };

/**
 * Catches WebGL / Three.js init errors and shows a static fallback instead
 * of crashing the whole page. Vite's HMR error overlay also stops triggering
 * because the boundary handles the throw.
 */
export class ThreeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[3D] disabled — falling back:", err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
