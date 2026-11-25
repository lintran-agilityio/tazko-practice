import { Route, Routes } from 'react-router'
import Placeholder from '../components/Placeholder'
import Shell from '../components/layout/Shell'
import { acceptInvitePath, screens } from './routes'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        {screens.map((s) => (
          <Route key={s.path} path={s.path} element={<Placeholder title={s.label} />} />
        ))}
      </Route>
      <Route path={acceptInvitePath} element={<Placeholder title="Accept invite" />} />
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  )
}
