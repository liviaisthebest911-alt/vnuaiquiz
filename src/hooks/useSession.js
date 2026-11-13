import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSession() {
    const [session, setSession] = useState(supabase ? undefined : null)

    useEffect(() => {
        if (!supabase) return
        const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
        return () => data.subscription.unsubscribe()
    }, [])

    return session
}
