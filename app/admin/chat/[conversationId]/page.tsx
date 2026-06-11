'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminChatRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin') }, [])
  return null
}
