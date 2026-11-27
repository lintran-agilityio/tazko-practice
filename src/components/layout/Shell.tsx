import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { groupLabels, screens, signInPath, type Screen } from '../../app/routes'
import { useAuth } from '../../features/auth/useAuth'

const groups = Object.keys(groupLabels) as Screen['group'][]

const roleLabel = { owner: 'Owner', member: 'Member', observer: 'Observer' } as const

export default function Shell() {
  const { account, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center gap-3 border-b border-line bg-surface p-3 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(true)}
          className="min-h-(--tap-min) min-w-(--tap-min) rounded-md border border-field-border"
        >
          ☰
        </button>
        <span className="font-bold">Tazko</span>
      </header>

      {open && (
        <div
          data-testid="backdrop"
          className="fixed inset-0 z-10 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <nav
        id="main-nav"
        aria-label="Main"
        data-open={open}
        className={`${open ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-20 w-64 flex-col gap-4 overflow-y-auto border-r border-line bg-surface p-4 md:static md:flex md:shrink-0`}
      >
        <p className="text-xl font-bold">Tazko</p>
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-1 text-xs font-semibold uppercase text-muted">
              {groupLabels[group]}
            </p>
            <ul>
              {screens
                .filter((s) => s.group === group && s.path !== signInPath)
                .map((s) => (
                  <li key={s.path}>
                    <NavLink
                      to={s.path}
                      end
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-(--tap-min) items-center rounded-md px-3 ${
                          isActive
                            ? 'bg-accent-soft font-semibold text-accent-strong'
                            : 'text-ink hover:bg-column'
                        }`
                      }
                    >
                      {s.label}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {account && (
          <div
            role="group"
            aria-label="Signed in as"
            className="mt-auto flex flex-col gap-2 border-t border-line pt-3"
          >
            <span className="font-semibold">{account.displayName}</span>
            <span className="w-fit rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
              {account.role ? roleLabel[account.role] : account.isSuperAdmin ? 'Super admin' : null}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-(--tap-min) rounded-md border border-field-border px-3 text-left"
            >
              Sign out
            </button>
          </div>
        )}
      </nav>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
