import React from "react";

export default function StudentSidebar({ onNavigate, active, onLogout }) {
  const menu = [
    { key: "studentDashboard", label: "แดชบอร์ดนักเรียน" },
    { key: "studentTimetable", label: "ตารางนักเรียน" },
    { key: "studentRoomUsage", label: "ตารางการใช้ห้อง" },
  ];

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen p-4 flex flex-col shadow-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-2">
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
      <nav className="flex-1 space-y-1">
        {menu.map((m) => (
          <div
            key={m.key}
            onClick={() => onNavigate(m.key)}
            className={`p-3 rounded-lg cursor-pointer transition-all 
              ${active === m.key 
                ? "bg-white text-slate-800 font-semibold shadow-sm" 
                : "hover:bg-slate-700"}
            `}
          >
            {m.label}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="mt-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg font-semibold transition-all"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}
