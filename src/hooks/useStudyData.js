import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function useStudyData(path, identity = null) {
    const [request, setRequest] = useState(null)
    const [revision, setRevision] = useState(0)

    useEffect(() => {
        if (!path) return
        const controller = new AbortController()
        const update = (state) => {
            if (!controller.signal.aborted) setRequest({ path, identity, revision, ...state })
        }
        api(path, { signal: controller.signal })
            .then(({ data, meta }) => update({ data, meta }))
            .catch((error) => update({ error }))
        return () => controller.abort()
    }, [path, identity, revision])

    const current = request && request.path === path && request.identity === identity && request.revision === revision
    return {
        data: current ? request.data : null,
        meta: current ? request.meta : null,
        error: current ? request.error : null,
        loading: Boolean(path && !current),
        reload: () => setRevision((n) => n + 1),
    }
}
