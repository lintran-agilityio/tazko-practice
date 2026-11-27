import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../../app/App";
import { acceptInvitePath, screens } from "../../../app/routes";
import { domain, mockAuth, session } from "./mockAuth";

vi.mock("../api");

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
const h1 = (name: string) => screen.findByRole("heading", { level: 1, name });

describe("route guard (M3-3)", () => {
  beforeEach(() => vi.resetAllMocks());

  const protectedScreens = screens.filter((s) => s.path !== "/sign-in");

  it.each(protectedScreens)(
    "sends a signed-out visitor from $path to Sign in",
    async ({ path }) => {
      mockAuth(null);
      renderAt(path);
      expect(await h1("Sign in")).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    },
  );

  it("sends an unknown route to Sign in too, never to a page of the app", async () => {
    mockAuth(null);
    renderAt("/no/such/page");
    expect(await h1("Sign in")).toBeInTheDocument();
  });

  it("leaves /accept-invite open to signed-out visitors", async () => {
    mockAuth(null);
    renderAt(acceptInvitePath);
    expect(await screen.findByRole("heading", { name: "Accept invite" })).toBeInTheDocument();
  });

  it("shows nothing of the app while the session is still loading", async () => {
    const auth = mockAuth(null);
    auth.api.getSession.mockReturnValue(new Promise(() => {}));
    renderAt("/board");
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Board" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Sign in" })).not.toBeInTheDocument();
  });

  it("returns to the requested page after signing in", async () => {
    const auth = mockAuth(null);
    auth.api.signInWithPassword.mockImplementation(async () => {
      auth.api.getSession.mockResolvedValue(session("minh"));
      act(() => auth.emit(session("minh")));
      return { error: null };
    });
    renderAt("/board");
    await userEvent.type(await screen.findByLabelText("Email"), `minh@${domain}`);
    await userEvent.type(await screen.findByLabelText("Password"), "pw-123456{Enter}");
    expect(await h1("Board")).toBeInTheDocument();
  });

  it("sends a signed-in person away from Sign in to Home", async () => {
    mockAuth(session("minh"));
    renderAt("/sign-in");
    expect(await h1("Home")).toBeInTheDocument();
  });

  it("lets a signed-in person use every screen inside the shell", async () => {
    mockAuth(session("minh"));
    renderAt("/labels");
    expect(await h1("Labels")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("goes to Sign in when the session ends while the app is open", async () => {
    const auth = mockAuth(session("minh"));
    renderAt("/board");
    await h1("Board");
    act(() => auth.emit(null));
    expect(await h1("Sign in")).toBeInTheDocument();
  });
});
