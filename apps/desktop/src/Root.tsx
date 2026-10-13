import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

export function Root(): React.JSX.Element {
  if (!window.nexus) {
    return (
      <main className="fatal" role="alert" aria-live="assertive">
        <div>
          <p className="eyebrow">Atlas Nexus</p>
          <h1>The secure desktop bridge did not load.</h1>
          <p>Restart the application. Your source folders have not been changed.</p>
          <details>
            <summary>Technical details</summary>
            <code>PRELOAD_BRIDGE_UNAVAILABLE: window.nexus is undefined</code>
          </details>
          <button onClick={() => location.reload()}>Reload interface</button>
        </div>
      </main>
    );
  }
  return <ErrorBoundary><App /></ErrorBoundary>;
}
