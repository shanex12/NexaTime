import React, { useState } from "react";

export default function StudentDashboard({ onClass, onRoom, onLogout }) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="container student-dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <img src="/image/Nexatime (2).png" className="logo" alt="NexaTime Logo" />
        <ul>
          <li className="active">Dashboard</li>
          <li onClick={onClass}>ตารางนักเรียน</li>
          <li>ตารางครู</li>
          <li onClick={onRoom}>ตารางการใช้ห้อง</li>
          <li className="logout" onClick={onLogout}>
            ออกจากระบบ
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Top bar */}
        <div className="topbar">
          <div className="profile">
            <img src="/image/student.png" alt="profile" />
            <span>Student</span>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="text">
            <h1>ยินดีต้อนรับ!</h1>
            <p className="welcome-desc">
              ยินดีต้อนรับเข้าสู่ระบบจัดการตารางเรียนของโรงเรียน  
              ที่นี่คุณสามารถตรวจสอบตารางเรียนของตนเอง ดูตารางรายห้อง  
              หรือค้นหาตารางตามครูและรายวิชาได้อย่างง่ายดาย  
              เพียงเลือกเมนูที่ต้องการจากแถบด้านซ้าย ระบบจะพาคุณไปยังหน้าที่ต้องการทันที  
            </p>
          </div>
          <img
            src="/image/NexaTimeRVc.png"
            className="banner-img"
            alt="NexaTime Banner"
          />
        </div>

        {/* Dashboard Cards */}
        <div className="cards">
          {/* ปุ่มเปิด popup วิธีใช้ */}
          <div
            className="guide-trigger card"
            onClick={() => setShowGuide(true)}
          >
            📘 วิธีการใช้งานระบบ
          </div>

          <div className="card" onClick={onClass}>
            <h3>👥 ตารางเรียนรายกลุ่ม</h3>
            <p>ดูตารางของแผนกหรือระดับชั้น</p>
          </div>

          <div className="card" onClick={onRoom}>
            <h3>🏫 การใช้ห้องเรียน</h3>
            <p>ตรวจสอบการจองห้องเรียน</p>
          </div>
        </div>
      </main>

      {/* Popup */}
      {showGuide && (
        <div className="popup-overlay active" id="popup">
          <div className="popup-box">
            <h2>วิธีการใช้งานระบบ</h2>
            <p>
              - ตรวจสอบตารางเรียนตามรายบุคคล <br />
              - ตรวจสอบการใช้ห้องเรียน <br />
              - ค้นหารายวิชาหรือดูข้อมูลครูผู้สอน <br />
              - ใช้งานง่าย เพียงเลือกเมนูทางซ้ายมือ
            </p>
            <button
              className="close-popup"
              onClick={() => setShowGuide(false)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
