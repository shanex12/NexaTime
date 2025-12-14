import React, { useState } from "react";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentDashboard({ onClass, onRoom, onLogout, onBack }) {

  return (
    <div className="h-screen overflow-hidden">
      {/* Sidebar นักเรียน */}
      <StudentSidebar
        onClass={onClass}
        onRoom={onRoom}
        onLogout={onLogout}
      />

{/* Main Content */}
<main className="ml-64 h-screen bg-gray-100 flex flex-col">

  {/* ===== Header ===== */}
  <div className="flex items-center justify-between px-6 py-3">
    <button
      onClick={onBack}
      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded inline-flex items-center gap-2"
    >
      ← ย้อนกลับ
    </button>

    <div className="flex items-center gap-2">
      <img src="/image/student.png" alt="profile" className="h-8" />
      <span className="font-semibold">Student</span>
    </div>
  </div>

  {/* ===== Scrollable Content ===== */}
  <div className="flex-1 overflow-y-auto px-6 pb-6">

    {/* Welcome Banner */}
    <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">ยินดีต้อนรับ!</h1>
        <p className="text-gray-600 max-w-xl">
          ตรวจสอบตารางเรียน ตารางห้องเรียน และข้อมูลที่เกี่ยวข้องได้ง่าย
          ผ่านเมนูทางด้านซ้าย
        </p>
      </div>
      <img
        src="/image/NexaTimeRVc.png"
        alt="banner"
        className="h-40 hidden md:block"
      />
    </div>

    {/* Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        className="bg-white p-6 rounded-xl shadow cursor-pointer hover:bg-gray-50"
        onClick={onClass}
      >
        <h3 className="font-bold text-lg">👥 ตารางเรียนรายกลุ่ม</h3>
        <p className="text-gray-600">ดูตารางเรียนของนักเรียน</p>
      </div>

      <div
        className="bg-white p-6 rounded-xl shadow cursor-pointer hover:bg-gray-50"
        onClick={onRoom}
      >
        <h3 className="font-bold text-lg">🏫 การใช้ห้องเรียน</h3>
        <p className="text-gray-600">ตรวจสอบตารางการใช้ห้อง</p>
      </div>
    </div>

  </div>
</main>
    </div>
  );
}
