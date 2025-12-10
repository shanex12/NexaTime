import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";

import LoginPage from "./LoginPage.jsx";
import StudentClassSelect from "./StudentClassSelect.jsx";
import StudentTimetablePage from "./StudentTimetable.jsx";
import StudentRoomUsage from "./StudentRoomUsage.jsx";

import Dashboard from "./Dashboard.jsx";
import Teachers from "./Teachers.jsx";
import Subjects from "./Subjects.jsx";
import Rooms from "./Rooms.jsx";
import Departments from "./Departments.jsx";
import Classgroups from "./Classgroups.jsx";
import Settings from "./Settings.jsx";
import Generate from "./Generate.jsx";
import TeacherTimetable from "./TeacherTimetable";
import Timetable from "./Timetable.jsx";
import RoomUsage from "./RoomUsage.jsx";
import ValidateTimetable from "./ValidateTimetable";
import DataImportExport from "./DataImportExport.jsx";

export default function App() {
  const [page, setPage] = useState("login");
  const [role, setRole] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // history stack สำหรับย้อนกลับ
  const [history, setHistory] = useState([]);

  // ฟังก์ชันเปลี่ยนหน้าแบบมี history
  function navigate(nextPage) {
    setHistory((prev) => [...prev, page]);
    setPage(nextPage);
    window.history.pushState({}, ""); // ให้ปุ่ม back browser ทำงานด้วย
  }

  // ฟังก์ชันย้อนกลับ
  function goBack() {
    if (history.length === 0) {
      // ไม่มีประวัติ → กลับหน้าแรกของ role
      if (role === "admin") setPage("dashboard");
      else setPage("studentSelectMenu");
      return;
    }

    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setPage(prev);
  }

  // ปรับให้ปุ่ม back ของ Browser ใช้งานได้ด้วย (ผูกครั้งเดียว)
  useEffect(() => {
    const handler = () => {
      goBack();
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [history, role]); 
  // หรือจะใส่ [] อย่างเดียวก็ได้ถ้าไม่ซีเรียส state ปัจจุบันตอน back

  // ✔ ล็อกอิน
  function handleLogin(userRole) {
    setRole(userRole);

    if (userRole === "admin") navigate("dashboard");
    else if (userRole === "student") navigate("studentSelectMenu");
  }

  // ✔ นักเรียนเลือกเมนูหลัก
  function handleStudentClass() {
    navigate("studentClassSelect");
  }

  function handleStudentRoom() {
    navigate("studentRoomUsage");
  }

  // ✔ เลือกห้องเรียน
  function handleSelectClass(c) {
    setSelectedClass(c);
    navigate("studentTimetable");
  }

  // ✔ เลือกห้องสำหรับดูการใช้งาน
  function handleSelectRoom(r) {
    setSelectedRoom(r);
    navigate("studentRoomUsageShow");
  }

  // ✔ ออกจากระบบ
  function handleLogout() {
    setRole(null);
    setSelectedClass(null);
    setSelectedRoom(null);
    setHistory([]);
    setPage("login");
  }

  // ✔ แสดงหน้า
  const renderPage = () => {
    switch (page) {
      case "login":
        return <LoginPage onLogin={handleLogin} />;

      case "studentSelectMenu":
        return (
          <StudentClassSelect
            onClass={handleStudentClass}
            onRoom={handleStudentRoom}
          />
        );

      case "studentClassSelect":
        return (
          <StudentClassSelect
            onSelectClass={handleSelectClass}
            type="class"
          />
        );

      case "studentTimetable":
        return <StudentTimetablePage className={selectedClass} />;

      case "studentRoomUsage":
        return (
          <StudentRoomUsage
            onSelectRoom={handleSelectRoom}
            type="selector"
          />
        );

      case "studentRoomUsageShow":
        return <StudentRoomUsage roomName={selectedRoom} />;

      case "dashboard":
        return <Dashboard />;

      case "teachers":
        return <Teachers />;

      case "subjects":
        return <Subjects />;

      case "rooms":
        return <Rooms />;

      case "departments":
        return <Departments />;

      case "classgroups":
        return <Classgroups />;

      case "settings":
        return <Settings />;

      case "generate":
        return <Generate />;

      case "teacherTimetable":
        return <TeacherTimetable />;

      case "timetable":
        return <Timetable />;

      case "roomUsage":
        return <RoomUsage />;

      case "validate":
        return <ValidateTimetable />;

      // ⭐ หน้าใหม่ นำเข้า/ส่งออกข้อมูล
      case "dataImport":
        return <DataImportExport />;

      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="flex w-full h-full">
      {/* Sidebar เฉพาะ admin */}
      {role === "admin" && page !== "login" && (
        <Sidebar onNavigate={navigate} active={page} onLogout={handleLogout} />
      )}

      <div className="flex-1 p-6">
        {/* ปุ่มย้อนกลับ (ยกเว้น login) */}
        {page !== "login" && (
          <button
            onClick={goBack}
            className="mb-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
          >
            ← ย้อนกลับ
          </button>
        )}

        {renderPage()}
      </div>
    </div>
  );
}
