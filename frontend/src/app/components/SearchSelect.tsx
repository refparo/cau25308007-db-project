import { useState } from "react"
import useSWR from "swr"

import { fetcher } from "@/utils"

import useComponentVisible from "./useComponentVisible"

export interface SelectItem {
  id: string
  name: string
}

export default function SearchSelect<T = SelectItem[]>({
  id, name, api, transform, defaultName, defaultId, onChange
}: {
  id: string,
  name: string,
  api(keyword: string): string,
  transform(data: T): SelectItem[],
  defaultName: string,
  defaultId: string,
  onChange?(value: string): void
}) {
  const {
    ref,
    isComponentVisible: showDropdown,
    setIsComponentVisible: setShowDropdown
  } = useComponentVisible(false)
  const [displayValue, setDisplayValue] = useState(defaultName)
  const [value, setValue] = useState(defaultId)
  const [searchValue, setSearchValue] = useState("")
  const options = useSWR<T>(showDropdown ? api(searchValue) : null, fetcher)
  return <div ref={ref}>
    <button type="button" id={id}
      className="bg-white outline-none border-b border-b-cyan-700"
      value={displayValue}
      onClick={() => {
        setSearchValue("")
        setShowDropdown(true)
      }}>{displayValue}</button>
    <div className="relative">
      <input name={name} value={value} readOnly className="hidden" />
      {showDropdown ? <div
          className="absolute top-[-1px] z-10 bg-gray-50 border border-cyan-700">
        <input type="text" placeholder="搜索" autoFocus
          className="m-1 outline-none border-b border-b-cyan-700"
          value={searchValue}
          onChange={e => setSearchValue(e.currentTarget.value)} />
        {(options.data ? transform(options.data) : []).map(option =>
          <div key={option.id} className="p-1 hover:bg-gray-200 cursor-pointer"
            onClick={() => {
              setShowDropdown(false)
              setDisplayValue(option.name)
              setValue(option.id)
              //;(document.getElementById(id) as HTMLInputElement).value = option.name
              onChange?.(option.id)
            }}>{option.name}</div>)}
      </div> : <></>}
    </div>
  </div>
}
