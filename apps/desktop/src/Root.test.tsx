// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Root } from "./Root";

afterEach(() => cleanup());

describe("renderer bootstrap", () => {
  it("shows an accessible diagnostic when the preload bridge is unavailable", () => {
    Reflect.deleteProperty(window, "nexus");
    render(<Root />);
    expect(screen.getByRole("alert")).toHaveTextContent("The secure desktop bridge did not load.");
    expect(screen.getByText(/PRELOAD_BRIDGE_UNAVAILABLE/)).toBeInTheDocument();
  });
});
