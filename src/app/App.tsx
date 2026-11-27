import { Route, Routes } from 'react-router'
import Placeholder from '../components/Placeholder'
import Shell from '../components/layout/Shell'
import { AuthProvider } from '../features/auth/AuthProvider'
import { PublicOnly, RequireAuth } from '../features/auth/RequireAuth'
import SignIn from '../features/auth/SignIn'
import { acceptInvitePath, signInPath, screens } from './routes'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path={signInPath}
          element={
            <PublicOnly>
              <SignIn />
            </PublicOnly>
          }
        />
        <Route path={acceptInvitePath} element={<Placeholder title="Accept invite" />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            {screens
              .filter((s) => s.path !== signInPath)
              .map((s) => (
                <Route key={s.path} path={s.path} element={<Placeholder title={s.label} />} />
              ))}
          </Route>
          <Route path="*" element={<Placeholder title="Page not found" />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
