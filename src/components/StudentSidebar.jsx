import React from "react";

export default function StudentSidebar({ onClass, onRoom, onLogout }) {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-slate-800 text-white flex flex-col p-4">
    {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-2">
          {/* ให้เซฟไฟล์โลโก้ไว้ที่ public/logo.png */}
          <img
            src="/NexaTimeRVc.png"
            alt="โลโก้ NexaTime"
            className="w-16 h-16 object-contain rounded-full bg-white shadow-md"
          />
        </div>
        <div className="text-2xl font-extrabold tracking-wide">NexaTime</div>
        <div className="text-sm text-blue-200 mt-1">ระบบจัดตารางเรียนอัตโนมัติ</div>
      </div>

      {/* Menu */}
      <ul className="flex-1 p-4 space-y-2">
        <li className="px-3 py-2 rounded bg-slate-700 font-semibold">
          Dashboard
        </li>

        <li
          className="px-3 py-2 rounded hover:bg-slate-700 cursor-pointer"
          onClick={onClass}
        >
          👥 ตารางนักเรียน
        </li>

        <li
          className="px-3 py-2 rounded hover:bg-slate-700 cursor-pointer"
          onClick={onRoom}
        >
          🏫 ตารางการใช้ห้อง
        </li>
      </ul>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full bg-red-600 hover:bg-red-700 py-2 rounded"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
