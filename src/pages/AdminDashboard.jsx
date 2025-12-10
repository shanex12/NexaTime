import React from "react";

export default function AdminDashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-blue-700 mb-4">
        แดชบอร์ดผู้ดูแลระบบ (Admin Dashboard)
      </h2>

      <div className="bg-white p-6 rounded-xl shadow-md border border-blue-200">
        <p className="text-gray-700 leading-relaxed">
          หน้านี้จะเป็นศูนย์กลางสำหรับผู้ดูแลระบบ เช่น
        </p>

        <ul className="list-disc ml-6 mt-3 text-gray-700">
          <li>ดูสถานะข้อมูลครู / ห้อง / วิชา</li>
          <li>สถานะการสร้างตารางล่าสุด</li>
          <li>จำนวนคาบแต่ละวัน</li>
          <li>ตรวจสอบความซ้ำซ้อนของข้อมูล</li>
          <li>เข้าถึงเมนูจัดการทั้งหมดจาก Sidebar</li>
        </ul>

        <p className="text-gray-600 mt-4">
          (* คุณสามารถปรับแต่งหน้านี้เองเพิ่มเติม เช่น สถิติ กราฟ หรือการแจ้งเตือน)
        </p>
      </div>
    </div>
    
  );
}
