import React from 'react';

export default function Sidebar({ onNavigate, active, onLogout}) {

  const menu = [
    { key: 'dashboard', label: 'แดชบอร์ด' },
    { key: 'teachers', label: 'จัดการครู' },
    { key: 'subjects', label: 'จัดการวิชา' },
    { key: 'rooms', label: 'จัดการห้องเรียน' },
    { key: 'classgroups', label: 'จัดการกลุ่มเรียน' },
    {key: 'groupsubjects', label: 'จัดการรายวิชากลุ่มเรียน' },
    { key: 'settings', label: 'ตั้งค่า AI' },
    { key: 'generate', label: 'สร้างตาราง' },
    { key: 'teacherTimetable', label: 'ตารางครู' },
    { key: 'timetable', label: 'ตารางเรียน' },
    { key: 'roomUsage', label: 'การใช้งานห้องเรียน' },
    { key: 'validate', label: 'ตรวจสอบตาราง' },

  ];

  return (
    <div className="w-64 bg-blue-700 text-white min-h-screen p-4 flex flex-col shadow-xl">

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
      <nav className="flex-1 space-y-1">
        {menu.map((m) => (
          <div
            key={m.key}
            onClick={() => onNavigate(m.key)}
            className={`p-3 rounded-lg cursor-pointer transition-all 
              ${active === m.key 
                ? "bg-white text-blue-700 font-semibold shadow-sm" 
                : "hover:bg-blue-600"
              }`}
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
