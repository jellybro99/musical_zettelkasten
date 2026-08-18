import { useParams } from 'react-router'
import { ArrangementView } from './ArrangementView'

// See SlipEditorRoute: keying on the param forces a full remount on
// param-only navigation so no stale arrangement state carries over.
export function ArrangementViewRoute() {
  const { arrangementId } = useParams<'arrangementId'>()
  return <ArrangementView key={arrangementId} arrangementId={arrangementId!} />
}
