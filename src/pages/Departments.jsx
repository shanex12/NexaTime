import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ id: "", name: "" });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const d = loadData();
    setDepartments(d.departments || []);
  }, []);

  function persist(list) {
    const d = loadData();
    d.departments = list;
    saveData(d);
  }

  function handleSave() {
    if (!form.name) return alert("กรุณากรอกชื่อแผนก");

    const dup = departments.find(
      (x) => x.name.trim() === form.name.trim() && x.id !== form.id
    );
    if (dup) return alert("แผนกนี้มีอยู่แล้ว");

    const item = { ...form, id: form.id || uid("dep") };
    const list = [...departments.filter((d) => d.id !== item.id), item];

    setDepartments(list);
    persist(list);
    setForm({ id: "", name: "" });
    setEditing(false);
  }

  function handleDelete(id) {
    if (!confirm("ลบแผนกนี้?")) return;
    const list = departments.filter((d) => d.id !== id);
    setDepartments(list);
    persist(list);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">จัดการแผนกวิชา</h2>

      <div className="grid grid-cols-2 gap-4">

        {/* FORM */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">
            {editing ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"}
          </h3>

          <input
            className="w-full p-2 border mb-2"
            placeholder="ชื่อแผนก เช่น คอมพิวเตอร์ธุรกิจ"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div className="flex gap-2">
            <button className="btn bg-blue-600" onClick={handleSave}>
              {editing ? "บันทึก" : "เพิ่ม"}
            </button>

            <button
              className="btn bg-gray-400"
              onClick={() => {
                setForm({ id: "", name: "" });
                setEditing(false);
              }}
            >
              ยกเลิก
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">รายการแผนก</h3>

          <div className="space-y-2 max-h-96 overflow-auto">
            {departments.map((d) => (
              <div
                key={d.id}
                className="p-2 border rounded flex justify-between items-center"
              >
                <div>{d.name}</div>

                <div className="flex gap-2">
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                    onClick={() => {
                      setForm(d);
                      setEditing(true);
                    }}
                  >
                    แก้ไข
                  </button>

                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => handleDelete(d.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {!departments.length && (
              <div className="text-sm text-slate-500">
                ยังไม่มีแผนกในระบบ
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
