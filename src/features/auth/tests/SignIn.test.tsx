import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../../app/App";
import { domain, mockAuth, session } from "./mockAuth";

vi.mock("../api");

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const email = () => screen.findByLabelText("Email");
const password = () => screen.findByLabelText("Password");

describe("Sign in screen (M3-1)", () => {
  let auth: ReturnType<typeof mockAuth>;
  beforeEach(() => {
    vi.resetAllMocks();
    auth = mockAuth(null);
  });

  it("shows labelled email and password fields with Sign in as the primary action", async () => {
    renderAt("/sign-in");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(await email()).toHaveAttribute("type", "email");
    expect(await password()).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument(); // M5
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });

  it('hints "Use your company account" at the email field for another domain, and keeps the input', async () => {
    renderAt("/sign-in");
    await userEvent.type(await email(), "sam@other.org");
    await userEvent.type(await password(), "whatever-123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const field = await email();
    expect(field).toHaveValue("sam@other.org");
    expect(field).toHaveAccessibleDescription("Use your company account");
    expect(field).toBeInvalid();
    expect(auth.api.signInWithPassword).not.toHaveBeenCalled();
  });

  it("accepts an allowed domain regardless of case and surrounding spaces", async () => {
    renderAt("/sign-in");
    await userEvent.type(await email(), `  Minh@${domain.toUpperCase()} `);
    await userEvent.type(await password(), "pw-123456");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(auth.api.signInWithPassword).toHaveBeenCalledTimes(1));
    expect(auth.api.signInWithPassword).toHaveBeenCalledWith(`minh@${domain}`, "pw-123456");
  });

  it("needs both fields: an empty form sends nothing and flags the empty fields", async () => {
    renderAt("/sign-in");
    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(auth.api.signInWithPassword).not.toHaveBeenCalled();
    expect(await email()).toBeInvalid();
    expect(await password()).toBeInvalid();
  });

  it("submits with Enter from the password field and lands on Home", async () => {
    auth.api.signInWithPassword.mockImplementation(async () => {
      auth.api.getSession.mockResolvedValue(session("minh"));
      act(() => auth.emit(session("minh")));
      return { error: null };
    });
    renderAt("/sign-in");
    await userEvent.type(await email(), `minh@${domain}`);
    await userEvent.type(await password(), "pw-123456{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("disables the button while a request is in flight (no double submit)", async () => {
    let finish: (v: { error: null }) => void = () => {};
    auth.api.signInWithPassword.mockReturnValue(new Promise((r) => (finish = r)));
    renderAt("/sign-in");
    await userEvent.type(await email(), `minh@${domain}`);
    await userEvent.type(await password(), "pw-123456");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: /sign/i })).toBeDisabled();
    await act(async () => finish({ error: null }));
  });
});

describe("Sign out (M3-1)", () => {
  it("signs out from the navigation and returns to Sign in", async () => {
    vi.resetAllMocks();
    const auth = mockAuth(session("minh"));
    auth.api.signOut.mockImplementation(async () => {
      auth.api.getSession.mockResolvedValue(null);
      act(() => auth.emit(null));
    });
    renderAt("/");
    await screen.findByRole("heading", { level: 1, name: "Home" });
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.api.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });
});
