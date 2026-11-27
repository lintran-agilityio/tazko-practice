import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../../app/App";
import { hoa, khoa, linh, minh, mockAuth, session, type Account } from "./mockAuth";

vi.mock("../api");

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

const footerFor = async (name: string, account: Account) => {
  mockAuth(session(name), account);
  renderHome();
  const nav = await screen.findByRole("navigation", { name: "Main" });
  return within(within(nav).getByRole("group", { name: "Signed in as" }));
};

describe("navigation footer (M3-4)", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ["minh", minh, "Minh", "Owner"],
    ["hoa", hoa, "Hoa", "Member"],
    ["khoa", khoa, "Khoa", "Observer"],
    ["linh", linh, "Linh", "Super admin"],
  ] as const)("shows %s with the role chip", async (key, account, shown, chip) => {
    const footer = await footerFor(key, account);
    expect(footer.getByText(shown)).toBeInTheDocument();
    expect(footer.getByText(chip)).toBeInTheDocument();
  });

  it("shows no role chip for a person with no role who is not a super admin", async () => {
    const footer = await footerFor("pat", { displayName: "Pat", role: null, isSuperAdmin: false });
    expect(footer.getByText("Pat")).toBeInTheDocument();
    expect(footer.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Signed in as" });
    expect(group).toHaveTextContent(/^PatSign out$/);
    expect(group.querySelectorAll("span")).toHaveLength(1); // the name only: no empty chip
  });

  it("has the Sign out button in the footer", async () => {
    const footer = await footerFor("minh", minh);
    expect(footer.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("asks the api for the account of the signed-in user", async () => {
    const auth = mockAuth(session("hoa"), hoa);
    renderHome();
    await screen.findByRole("navigation", { name: "Main" });
    expect(auth.api.loadAccount).toHaveBeenCalledWith("id-hoa");
  });
});
