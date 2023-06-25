'use client'

import React, { useState } from "react"

export interface PopupContext {
  setVisible: (visible: boolean) => void
  setContent: (content: React.ReactNode) => void
}

const PopupContext = React.createContext<PopupContext>(undefined as unknown as PopupContext)

export const usePopup = () => React.useContext(PopupContext)

export default function ClientLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [popupVisible, setPopupVisible] = useState<boolean>(false)
  const [popupContent, setPopupContent] = useState<React.ReactNode>(<></>)
  return <>
    <PopupContext.Provider value={{
      setVisible: setPopupVisible,
      setContent: setPopupContent
    }}>
      {children}
    </PopupContext.Provider>
    {popupVisible
    ? <div onClick={() => setPopupVisible(false)}
          className="fixed top-0 bottom-0 left-0 right-0 z-50
            backdrop-blur animate-blur flex justify-center items-center">
        <div onClick={e => e.stopPropagation()}
          className="px-10 py-8 rounded-2xl flex flex-col gap-8
            bg-gray-200 shadow-2xl shadow-gray-900 text-gray-700">
          {popupContent}
        </div>
      </div>
    : <></>}
  </>
}
