'use client'
import { useAccountInfo } from "./layout"

export default function Dashboard() {
  const { role, name } = useAccountInfo()
  return <>
    <h1 className="text-3xl">
      你好，{name}{({ "student": "同学", "teacher": "老师", "admin": "老师" })[role]}！
    </h1>
    <div>请在左边栏中选择功能。</div>
  </>
}
