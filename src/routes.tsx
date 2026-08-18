import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ArrangementDashboard } from './components/ArrangementDashboard'
import { ArrangementViewRoute } from './components/ArrangementViewRoute'
import { DeskStub } from './components/DeskStub'
import { SlipDashboard } from './components/SlipDashboard'
import { SlipEditorRoute } from './components/SlipEditorRoute'

export const routeTree: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/slips" replace /> },
      { path: 'slips', element: <SlipDashboard /> },
      { path: 'slips/:slipId', element: <SlipEditorRoute /> },
      { path: 'arrange', element: <ArrangementDashboard /> },
      { path: 'arrange/:arrangementId', element: <ArrangementViewRoute /> },
      { path: 'desk', element: <DeskStub /> },
      { path: '*', element: <Navigate to="/slips" replace /> },
    ],
  },
]
