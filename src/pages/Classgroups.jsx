import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";


export default function ClassGroups() {
  const [departments, setDepartments] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [editing, setEditing] = useState(false);

  const emptyForm = {
    id: "",
    name: "",
    department_id: "",
    studentCount: 0
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const d = loadData();
    setDepartments(d.departments || []);
    setClassGroups(d.classGroups || []);
  }, []);

  function persist(list) {
    const d = loadData();
    d.classGroups = list;
    saveData(d);
  }

  function handleSave() {
    if (!form.name) return alert("กรุณากรอกชื่อกลุ่มเรียน");
    if (!form.department_id) return alert("กรุณาเลือกแผนก");

    const item = { ...form, id: form.id || uid("cg") };

    const newList = [
      ...classGroups.filter(g => g.id !== item.id),
      item
    ];

    setClassGroups(newList);
    persist(newList);
    setForm(emptyForm);
    setEditing(false);
  }

  function handleEdit(cg) {
    setForm(cg);
    setEditing(true);
  }

  function handleDelete(id) {
    if (!confirm("ต้องการลบกลุ่มเรียนนี้หรือไม่?")) return;
    const newList = classGroups.filter(c => c.id !== id);
    setClassGroups(newList);
    persist(newList);
  }

function handleImportCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  parseCSV(file, (rows) => {
    const imported = rows.map(r => ({
      id: uid("cg"),
      name: r.group_name || "",
      department_id: r.department_id || "",
      studentCount: Number(r.student_count || 0)
    }));

    const newList = [...classGroups, ...imported];
    setClassGroups(newList);
    persist(newList);

    alert("นำเข้ากลุ่มเรียนแล้ว");
  });
}


  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">จัดการกลุ่มเรียน</h2>

      <div className="grid grid-cols-2 gap-4">

        {/* form */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">
            {editing ? "แก้ไขกลุ่มเรียน" : "เพิ่มกลุ่มเรียนใหม่"}
          </h3>

          {/* ชื่อกลุ่มเรียน */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">
              ชื่อกลุ่มเรียน
            </label>
            <input
              className="w-full p-2 border rounded"
              placeholder="เช่น ปวช.1/1, ปวส.2/3"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <div className="text-xs text-gray-500 mt-1">
              ใช้ชื่อกลุ่มตามทะเบียนจริง เช่น ปวช.1/1, ปวช.2/2 หรือ ปวส.1/3
            </div>
          </div>

          {/* เลือกแผนก */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">
              แผนกที่สังกัด
            </label>
            <select
              className="w-full p-2 border rounded"
              value={form.department_id}
              onChange={e => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">-- เลือกแผนก --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              ใช้สำหรับเชื่อมกลุ่มเรียนกับรายวิชาในแผนกนั้น
              และใช้ฟิลเตอร์ตอนสร้างตารางเรียน
            </div>
          </div>

          {/* จำนวนผู้เรียน */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">
              จำนวนนักเรียนในกลุ่ม
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              placeholder="เช่น 35"
              value={form.studentCount}
              onChange={e => setForm({ ...form, studentCount: Number(e.target.value) })}
            />
            <div className="text-xs text-gray-500 mt-1">
              ระบบจะใช้ตัวเลขนี้ไปตรวจว่าแต่ละห้องเรียนมีความจุ (capacity) เพียงพอหรือไม่
              ตอนที่ AI เลือกห้องให้กลุ่มนี้
            </div>
          </div>

          <button className="btn bg-blue-600 w-full" onClick={handleSave}>
            {editing ? "บันทึก" : "เพิ่มกลุ่มเรียน"}
          </button>

<label className="btn bg-green-600 mb-2 cursor-pointer">
  📂 นำเข้าไฟล์ CSV
  <input type="file" hidden accept=".csv" onChange={handleImportCSV} />
</label>

        </div>

        {/* list */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">รายชื่อกลุ่มเรียน</h3>

          <div className="space-y-2 max-h-96 overflow-auto text-sm">
            {classGroups.map(c => (
              <div key={c.id} className="p-2 border rounded flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base">{c.name}</div>
                  <div className="text-slate-500">
                    แผนก: {departments.find(d => d.id === c.department_id)?.name || "ไม่พบ"}
                  </div>
                  <div className="text-slate-500">
                    จำนวนนักเรียน: {c.studentCount || 0} คน
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                    onClick={() => handleEdit(c)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(c.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {classGroups.length === 0 && (
              <div className="text-sm text-slate-500">ยังไม่มีข้อมูลกลุ่มเรียน</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
