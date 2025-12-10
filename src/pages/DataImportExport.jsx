import React, { useState } from "react";
import { loadData, saveData } from "../utils";

export default function DataImportExport() {
  const [status, setStatus] = useState("");
  const [fileName, setFileName] = useState("");

  // ตรวจโครงสร้างข้อมูลเบื้องต้น
  function validateData(obj) {
    if (!obj || typeof obj !== "object") {
      throw new Error("ไฟล์ไม่ใช่ JSON object");
    }

    const requiredKeys = [
      "settings",
      "departments",
      "classGroups",
      "teachers",
      "rooms",
      "subjects"
    ];

    const missing = requiredKeys.filter((k) => !(k in obj));

    if (missing.length > 0) {
      const msg =
        "คำเตือน: ข้อมูลขาดฟิลด์สำคัญ: " + missing.join(", ") +
        " (ระบบยังพอใช้งานได้ แต่บางหน้าจะว่าง)";
      console.warn(msg);
      return msg;
    }

    return "";
  }

  // นำเข้าข้อมูลจากไฟล์ JSON
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("กำลังอ่านไฟล์...");

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const json = JSON.parse(text);

        const warnMsg = validateData(json);

        if (
          !window.confirm(
            "ยืนยันการนำเข้าข้อมูลจากไฟล์: " +
              file.name +
              "\nข้อมูลเดิมทั้งหมดจะถูกแทนที่"
          )
        ) {
          setStatus("ยกเลิกการนำเข้าข้อมูล");
          return;
        }

        // ถ้ายังไม่มี allTimetables ให้สร้างเป็น object ว่าง
        if (!json.allTimetables) {
          json.allTimetables = {};
        }

        saveData(json);
        setStatus(
          "✔ นำเข้าข้อมูลสำเร็จ" +
            (warnMsg ? " (มีคำเตือน: " + warnMsg + ")" : "")
        );
      } catch (err) {
        console.error(err);
        setStatus("❌ ผิดพลาดในการอ่านไฟล์หรือรูปแบบ JSON ไม่ถูกต้อง");
      }
    };

    reader.onerror = () => {
      setStatus("❌ อ่านไฟล์ไม่สำเร็จ");
    };

    reader.readAsText(file, "utf-8");
  }

  // ส่งออกข้อมูลเป็นไฟล์ JSON
  function handleExport() {
    try {
      const data = loadData() || {};
      const jsonStr = JSON.stringify(data, null, 2);

      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const time = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      a.href = url;
      a.download = `NexaTime-backup-${time}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("✔ ส่งออกข้อมูลเรียบร้อยแล้ว");
    } catch (err) {
      console.error(err);
      setStatus("❌ ส่งออกข้อมูลไม่สำเร็จ");
    }
  }

  // ดาวน์โหลด template เปล่า ๆ (เผื่ออยากกรอกเอง)
  function handleDownloadTemplate() {
    const template = {
      settings: {
        days: 5,
        timeslots_per_day: 10
      },
      departments: [],
      classGroups: [],
      teachers: [],
      rooms: [],
      subjects: [],
      allTimetables: {}
    };

    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "NexaTime-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus("✔ ดาวน์โหลดไฟล์ Template เรียบร้อย");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        นำเข้า / ส่งออกข้อมูลระบบ (ไฟล์ JSON)
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* กล่องนำเข้า */}
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold">นำเข้าข้อมูลจากไฟล์</h3>
          <p className="text-sm text-gray-700">
            เลือกไฟล์ JSON ที่มีข้อมูล ครู ห้องเรียน แผนก กลุ่มเรียน รายวิชา
            เพื่อนำมาใช้ในระบบ NexaTime
          </p>

          <label className="block">
            <span className="text-sm font-medium mb-1 inline-block">
              เลือกไฟล์ JSON
            </span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="block w-full text-sm border rounded-lg p-2 bg-white"
            />
          </label>

          {fileName && (
            <div className="text-xs text-gray-600">
              ไฟล์ที่เลือก: <span className="font-medium">{fileName}</span>
            </div>
          )}

          <div className="text-xs text-red-500">
            * ข้อมูลเดิมทั้งหมดจะถูกแทนที่เมื่อยืนยันนำเข้า
          </div>
        </div>

        {/* กล่องส่งออก */}
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold">สำรอง / ส่งออกข้อมูล</h3>
          <p className="text-sm text-gray-700">
            ดาวน์โหลดข้อมูลปัจจุบันทั้งหมดของระบบ
            เพื่อสำรองหรือย้ายไปใช้ในเครื่องอื่น
          </p>

          <button
            onClick={handleExport}
            className="btn bg-blue-600 w-full text-center hover:bg-blue-700 transition"
          >
            ดาวน์โหลดข้อมูลปัจจุบัน (.json)
          </button>

          <hr className="my-2" />

          <p className="text-sm text-gray-700">
            ถ้าต้องการโครง JSON เปล่า ๆ สำหรับกรอกเอง
          </p>

          <button
            onClick={handleDownloadTemplate}
            className="btn bg-gray-600 w-full text-center hover:bg-gray-700 transition"
          >
            ดาวน์โหลด Template ว่าง (.json)
          </button>
        </div>
      </div>

      {/* แสดงสถานะ */}
      {status && (
        <div className="mt-4 text-sm bg-gray-100 border border-gray-200 rounded p-3">
          {status}
        </div>
      )}
    </div>
  );
}
