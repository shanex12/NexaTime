import React from "react";

export default function TeacherSidebar({ onNavigate, active, onLogout }) {
  const menu = [
    { key: "teacherDashboard", label: "แดชบอร์ดครู" },
    { key: "teacherTimetable", label: "ตารางสอนของฉัน" },
    { key: "teachers", label: "เพิ่มรายวิชา / แก้ไขข้อมูลครู" },
  ];

  return (
    <div className="w-64 h-full p-4 flex flex-col shadow-xl bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white absolute left-0 top-0 bottom-0">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-2">
          <img
            src="/image/NexaTimeRVc (1).png"
            alt="โลโก้ครู"
            className="w-16 h-16 object-contain rounded-full bg-white shadow-md"
          />
        </div>
        <div className="text-2xl font-extrabold tracking-wide">NexaTime</div>
        <div className="text-sm text-gray-200 mt-1">ระบบจัดตารางเรียนอัตโนมัติ</div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1">
        {menu.map((m) => (
          <div
            key={m.key}
            onClick={() => onNavigate(m.key)}
            className={`p-3 rounded-lg cursor-pointer transition-all border border-transparent border-l-4
              ${active === m.key 
                ? "bg-white text-gray-900 font-semibold shadow-sm border-l-white" 
                : "border-l-transparent hover:bg-white hover:text-gray-900 hover:font-semibold hover:shadow-sm"}
            `}
          >
            {m.label}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="mt-4 bg-pink-500 hover:bg-pink-600 text-white p-2 rounded-lg font-semibold transition-all"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}
