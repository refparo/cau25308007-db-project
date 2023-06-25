'use client';
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { API_BASE } from "@/config"

import { usePopup } from "./layout-client"

export default function LoginPage() {
  const popup = usePopup()
  const router = useRouter()
  // 若用户已登录，则跳转到主页
  const loggedIn = typeof window != "undefined" && (
    window.sessionStorage.getItem("logged-in") ||
    window.localStorage.getItem("logged-in")
  )
  useEffect(() => {
    if (loggedIn) {
      router.push('/dashboard')
    }
    router.prefetch('/dashboard')
  }, [loggedIn])
  const login = async (data: FormData) => {
    try {
      const resp = await fetch(new URL("/session", API_BASE), {
        method: 'POST',
        credentials: 'include',
        body: data
      })
      if (!resp.ok) throw new Error(
        await resp.json()
          .then(json => json.info)
          .catch(() => resp.statusText))
      if (data.get("auto-login")) {
        window.localStorage.setItem("logged-in", "1")
      }
      window.sessionStorage.setItem("logged-in", "1")
      router.push('/dashboard')
    } catch (e) {
      popup.setContent(<>
        <h1 className="text-2xl">错误</h1>
        <div>{`${e}`}</div>
      </>)
      popup.setVisible(true)
    }
  }
  return <>
    <div className="min-h-screen flex justify-center items-center bg-cyan-950">
      <main className="px-10 py-8 rounded-2xl flex flex-col gap-8 items-center
          bg-cyan-900 shadow-2xl shadow-gray-900 text-gray-200">
        <h1 className="text-center text-2xl text-white drop-shadow-lg">教学管理系统</h1>
        <form onSubmit={e => {
          e.preventDefault()
          login(new FormData(e.currentTarget)) 
        }} className="flex flex-col gap-8 items-center">
          {(() => {
            const className = `w-72 px-3 py-2 rounded-md outline-none
              text-gray-700 shadow-lg transition-all focus:bg-gray-200`
            return <>
              <input type="text" name="username" required
                placeholder="账号" className={className} />
              <input type="password" name="password" required
                placeholder="密码" className={className} />
            </>
          })()}
          <div className="w-full flex justify-between items-center">
            <div className="flex gap-2 transition-all hover:text-white">
              <input type="checkbox" id="auto-login" name="auto-login" />
              <label htmlFor="auto-login">30 天免登录</label>
            </div>
            <input type="submit" value="登录" className="button px-6 py-2"/>
          </div>
        </form>
      </main>
    </div>
  </>
}
