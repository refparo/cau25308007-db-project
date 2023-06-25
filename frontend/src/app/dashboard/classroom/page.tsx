'use client'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import useSWR from "swr"

import useComponentVisible from "@/app/components/useComponentVisible"
import { API_BASE } from "@/config"
import { fetcher } from "@/utils"

import { usePopup } from "../../layout-client"
import { useAccountInfo } from "../layout"

interface Classroom {
  location: string
  capacity: number
  facility: number
}

interface Classrooms {
  total: number
  classroom: { [id: string]: Classroom }
}

export default function ClassroomManagement() {
  const router = useRouter()
  const { role } = useAccountInfo()
  const [pageLen, setPageLen] = useState(10)
  const [page, setPage] = useState(0)
  const switchPage = (page: number) => {
    setPage(page)
    window.scrollTo({
      behavior: "smooth",
      top: 0
    })
  }
  const classrooms = useSWR<Classrooms>(
    role == "admin" ? `/classroom?offset=${page * pageLen}&length=${pageLen}` : null,
    fetcher)
  const totalPage = Math.ceil((classrooms.data?.total ?? 0) / pageLen)
  useEffect(() => {
    if (role != "admin") router.push('/dashboard')
  }, [role])
  return <>
    <h1 className="text-3xl">教室管理</h1>
    <div>
      <div className="py-1 border-b border-cyan-700 bg-gray-50 sticky top-0 z-20
          flex items-center justify-between">
        {/* 查询教室 */}
        <div className="flex items-center gap-4">
          <form className="flex items-center gap-4"
              onSubmit={e => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                setPageLen(data.get("page-length") as unknown as number)
                switchPage(0)
              }}>
            <div className="flex gap-2 items-center">
              <label htmlFor="page-length" className="font-bold">每页显示</label>
              <input type="number" name="page-length" id="page-length"
                defaultValue={pageLen} min={5} max={100} required
                className="w-16 outline-none border-b border-b-cyan-700"/>
            </div>
            <input type="submit" value="检索" className="button" />
          </form>
        </div>
        {/* 页面切换 */}
        <div className="flex gap-4">
          <div className="flex shadow-lg">
            <button disabled={page == 0} onClick={() => switchPage(0)}
                className="button shadow-none rounded-r-none border-r
                  border-cyan-800 disabled:border-gray-500">
              ««</button>
            <button disabled={page == 0} onClick={() => switchPage(page - 1)}
                className="button shadow-none rounded-none border-r
                  border-cyan-800 disabled:border-gray-500">«</button>
            <button disabled={(page + 1) >= totalPage} onClick={() => switchPage(page + 1)}
                className="button shadow-none rounded-none border-r
                  border-cyan-800 disabled:border-gray-500">»</button>
            <button disabled={(page + 1) >= totalPage}
                onClick={() => switchPage(totalPage - 1)}
                className="button shadow-none rounded-l-none">»»</button>
          </div>
          <form className="flex gap-2 items-center"
              onSubmit={e => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                switchPage(data.get("page") as unknown as number - 1)
                ;(e.currentTarget.querySelector("input[type=number]")! as HTMLInputElement).value = ""
              }}>
            <div>
              <span>第 </span>
              <input type="number" name="page" min={1} max={totalPage} required
                placeholder={`${page + 1}`}
                className="w-8 outline-none border-b border-b-cyan-700 appearance-textfield" />
              <span>/{totalPage} 页</span>
            </div>
            <input type="submit" value="跳转" className="button" />
          </form>
        </div>
      </div>
      <div className="border-b border-cyan-700
          grid grid-cols-[repeat(4,max-content)_1fr]">
        <div className="px-4 py-0.5 font-bold text-center">编号</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">地点</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">容量</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">设施</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
        {classrooms.data ? Object.entries(classrooms.data.classroom).map(([id, classroom]) =>
          <ClassroomRow key={id} id={id} classroom={classroom}
            mutate={classrooms.mutate}></ClassroomRow>
        ) : <></>}
        <ClassroomRow isNew mutate={classrooms.mutate}></ClassroomRow>
      </div>
    </div>
  </>
}

function ClassroomRow({ id, classroom, isNew, mutate }: {
  id?: string,
  classroom?: Classroom
  isNew?: true
  mutate(): void
}) {
  const popup = usePopup()
  const [newId, setNewId] = useState("")
  const [location, setLocation] = useState(classroom?.location ?? "")
  const [capacity, setCapacity] = useState(classroom?.capacity ?? 0)
  const [facility, setFacility] = useState(classroom?.facility ?? 0)
  const [modified, setModified] = useState(false)
  return <>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">
      {isNew
      ? <input type="text"
          value={newId} required
          onChange={e => {
            setNewId(e.currentTarget.value)
            setModified(true)
          }}
          placeholder="新建"
          className="w-16 outline-none border-b border-b-cyan-700" />
      : id}
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <input type="text"
        value={location} required
        onChange={e => {
          setLocation(e.currentTarget.value)
          setModified(true)
        }}
        className="outline-none border-b border-b-cyan-700" />
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <input type="number"
        value={capacity} min="0" step="1" required
        onChange={e => {
          setCapacity(e.currentTarget.valueAsNumber)
          setModified(true)
        }}
        className="w-16 outline-none border-b border-b-cyan-700" />
    </div>
    <div className="px-1 py-0.5 flex items-center border-t border-l border-cyan-700">
      <FacilitySelect value={facility} onChange={value => {
        setFacility(value)
        setModified(true)
      }}></FacilitySelect>
    </div>
    <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
      <button disabled={isNew ? newId == "" : !modified} className="button"
        onClick={async () => {
          const data = new FormData()
          data.set("location", location)
          data.set("capacity", capacity.toString())
          data.set("facility", facility.toString())
          try {
            const resp = await fetch(
              new URL(`/classroom?id=${isNew ? newId : id}`, API_BASE),
              {
                method: isNew ? 'PUT' : 'POST',
                credentials: 'include',
                body: data
              })
            if (!resp.ok) throw new Error(
              await resp.json()
                .then(json => json.info)
                .catch(() => resp.statusText))
          } catch (e) {
            popup.setContent(<>
              <h1 className="text-3xl">错误</h1>
              <div className="whitespace-pre-wrap">{`${e}`}</div>
            </>)
            popup.setVisible(true)
            return
          }
          setModified(false)
          mutate()
        }}>{isNew ? "新建" : "保存"}</button>
      {!isNew ? <>
        <button disabled={!modified} className="button"
          onClick={() => {
            setLocation(classroom!.location)
            setCapacity(classroom!.capacity)
            setFacility(classroom!.facility)
            setModified(false)
          }}>取消</button>
        <button className="button hover:bg-red-600"
          onClick={async () => {
            try {
              const resp = await fetch(
                new URL(`/classroom?id=${id}`, API_BASE),
                {
                  method: 'DELETE',
                  credentials: 'include'
                })
              if (!resp.ok) throw new Error(
                await resp.json()
                  .then(json => json.info)
                  .catch(() => resp.statusText))
            } catch (e) {
              popup.setContent(<>
                <h1 className="text-3xl">错误</h1>
                <div className="whitespace-pre-wrap">{`${e}`}</div>
              </>)
              popup.setVisible(true)
              return
            }
            mutate()
          }}>删除</button>
      </>: <></>}
    </div>
  </>
}

function FacilitySelect({ value, onChange }: {
  value: number,
  onChange(value: number): void
}) {
  const {
    ref,
    isComponentVisible: showDropdown,
    setIsComponentVisible: setShowDropdown
  } = useComponentVisible(false)
  const randKey = Math.random().toString()
  const facilities = ["多媒体设备", "实验设施", "学生上机"]
  return <div ref={ref} className="flex-grow">
    <button type="button"
      className="w-full before:content-['\200B'] bg-white outline-none border-b border-b-cyan-700"
      onClick={() => setShowDropdown(true)}>{facilities.filter((_, i) => value & (1 << i)).join("、")}</button>
    <div className="relative">
      {showDropdown ? <div
          className="absolute top-[-1px] z-10 bg-gray-50 border border-cyan-700">
        {facilities.map((name, i) => <div key={i} className="p-1 flex flex-row gap-1">
          <input type="checkbox" id={`facility-select-${randKey}-${i}`}
            checked={(value & (1 << i)) > 0}
            onChange={() => onChange(value ^ (1 << i))} />
          <label htmlFor={`facility-select-${randKey}-${i}`}>{name}</label>
        </div>)}
      </div> : <></>}
    </div>
  </div>
}
