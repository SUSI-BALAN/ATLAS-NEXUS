import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: Readonly<{ error: Error | null }> = { error: null };
  static getDerivedStateFromError(error: Error): { error: Error } { return { error }; }
  override componentDidCatch(error: Error, info: ErrorInfo): void { console.error("Renderer failed", { name: error.name, componentStack: info.componentStack }); }
  override render(): ReactNode {
    if (this.state.error) return <main className="fatal" role="alert" aria-live="assertive"><div><p className="eyebrow">Atlas Nexus</p><h1>The interface could not load.</h1><p>Restart the application. Your source folders have not been changed.</p><details><summary>Technical details</summary><code>{this.state.error.name}: {this.state.error.message}</code></details><button onClick={() => location.reload()}>Reload interface</button></div></main>;
    return this.props.children;
  }
}
