'use client'
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect } from "react"
import useSWR from "swr"

import { API_BASE } from "@/config"
import { fetcher } from "@/utils"

export interface AccountInfo {
  id: string
  role: string
  name: string
}

const AccountInfo = React.createContext(undefined as unknown as AccountInfo)

export const useAccountInfo = () => React.useContext(AccountInfo)

export interface TermInfo {
  current: string,
  terms: { [id: string]: string }
  mutate(): void
}

const TermInfo = React.createContext(undefined as unknown as TermInfo)

export const useTermInfo = () => React.useContext(TermInfo)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  // 检测用户的登录状态
  const loggedIn = typeof window != "undefined" && (
    window.sessionStorage.getItem("logged-in") ||
    window.localStorage.getItem("logged-in")
  )
  const account = useSWR<AccountInfo>(loggedIn ? '/my-account' : null, fetcher, {
    onError(err, key, config) {
      window.sessionStorage.removeItem("logged-in")
      window.localStorage.removeItem("logged-in")
      router.push('/')
    }
  })
  const terms = useSWR<TermInfo>(loggedIn ? "/term" : null, fetcher, {
    revalidateOnFocus: false
  })
  useEffect(() => {
    if (!loggedIn) router.push('/')
  }, [loggedIn])
  const logout = async () => {
    window.sessionStorage.removeItem("logged-in")
    window.localStorage.removeItem("logged-in")
    try {
      await fetch(new URL("/session", API_BASE), {
        method: 'DELETE',
        credentials: 'include'
      })
    } finally {
      router.push('/')
    }
  }
  const navLinkClassName = `px-3 py-2 rounded-md hover:bg-cyan-900 transition-all`
  return <>
    <aside className="fixed top-0 bottom-0 left-0 w-64
        px-4 py-5 flex flex-col gap-3
        bg-cyan-950 shadow-2xl shadow-gray-900 text-gray-200">
      <h1 className="text-center text-xl">教学管理系统</h1>
      <nav className="flex flex-col overflow-y-auto">
        <Link className={navLinkClassName} href="/dashboard">首页</Link>
        <Link className={navLinkClassName} href="/dashboard/my-account">账号信息</Link>
        {(() => {
          switch (account.data?.role) {
            case 'student': return <>
              <Link className={navLinkClassName} href="/dashboard/schedule">课程表</Link>
              <Link className={navLinkClassName} href="/dashboard/register">选课</Link>
            </>
            case 'teacher': return <>
              <Link className={navLinkClassName} href="/dashboard/schedule">课程表</Link>
              <Link className={navLinkClassName} href="/dashboard/course">课程管理</Link>
            </>
            case 'admin': return <>
              <Link className={navLinkClassName} href="/dashboard/account">账号管理</Link>
              <Link className={navLinkClassName} href="/dashboard/term">学期管理</Link>
              <Link className={navLinkClassName} href="/dashboard/course">课程管理</Link>
              <Link className={navLinkClassName} href="/dashboard/classroom">教室管理</Link>
            </>
            default: return <></>
          }
        })()}
        <div className={navLinkClassName + " cursor-pointer hover:bg-red-900"}
          onMouseEnter={() => router.prefetch('/')}
          onClick={logout}>注销</div>
      </nav>
    </aside>
    <div className="min-h-screen ml-64 p-5 bg-gray-100">
      <div className="rounded-md p-6 bg-gray-50 shadow-lg text-gray-800
          flex flex-col gap-6">
        {(account.data && terms.data)
        ? <AccountInfo.Provider value={account.data}>
            <TermInfo.Provider value={{ ...terms.data, mutate: terms.mutate }}>
              {children}
            </TermInfo.Provider>
          </AccountInfo.Provider>
        : <>加载中……</>}
      </div>
    </div>
  </>
}
