import { useParams } from 'react-router'
import { SlipEditor } from './SlipEditor'

// React Router keeps a route's element mounted across param-only changes
// (e.g. navigating from one slip to another). Keying on the param forces a
// full remount so a screen never inherits local state left over from
// whichever slip the user was previously looking at.
export function SlipEditorRoute() {
  const { slipId } = useParams<'slipId'>()
  return <SlipEditor key={slipId} slipId={slipId!} />
}
