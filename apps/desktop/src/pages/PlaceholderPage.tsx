import { Construction } from "lucide-react";
import type { JSX } from "react";

export function PlaceholderPage({ title, heading, detail }: { title: string; heading: string; detail: string }): JSX.Element {
  return <div className="page"><section className="placeholder panel"><div className="placeholder-icon"><Construction/></div><span className="eyebrow">{title}</span><h2>{heading}</h2><p>{detail}</p><div className="stage-badge">Future stage</div></section></div>;
}
