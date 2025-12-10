import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";

const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์"];

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState({ timeslots_per_day: 6 });

  const emptyForm = {
    id: "",
    name: "",
    max_per_day: 4,
    unavailable: []
  };

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const d = loadData();
    setTeachers(d.teachers || []);
    setSettings(d.settings || { timeslots_per_day: 6 });
  }, []);

  function persist(list) {
    const d = loadData();
    d.teachers = list;
    saveData(d);
  }

  function safeTeacher(t) {
    return {
      ...t,
      unavailable: Array.isArray(t.unavailable) ? t.unavailable : []
    };
  }

  function toggleUnavailable(day, slot) {
    const exists = form.unavailable.some(
      (u) => u.day === day && u.slot === slot
    );

    const updated = exists
      ? form.unavailable.filter((u) => !(u.day === day && u.slot === slot))
      : [...form.unavailable, { day, slot }];

    setForm({ ...form, unavailable: updated });
  }

  function handleSave() {
    if (!form.name)
      return alert("กรุณากรอกชื่อครู");

    if (!form.max_per_day)
      return alert("กรุณาเลือกจำนวนคาบสูงสุดต่อวัน");

    // ป้องกันชื่อครูซ้ำ
    const nameDup = teachers.find(
      (t) => t.name === form.name && t.id !== form.id
    );
    if (nameDup) return alert("มีชื่อครูนี้อยู่ในระบบแล้ว!");

    const item = safeTeacher({
      ...form,
      id: form.id || uid("t")
    });

    const newList = [
      ...teachers.filter((t) => t.id !== item.id),
      item
    ];

    setTeachers(newList);
    persist(newList);

    setForm(emptyForm);
    setEditing(false);
  }

  function handleEdit(t) {
    setForm(safeTeacher(t));
    setEditing(true);
  }

  function handleDelete(id) {
    if (!confirm("ต้องการลบครูคนนี้ใช่หรือไม่?")) return;
    const list = teachers.filter((t) => t.id !== id);
    setTeachers(list);
    persist(list);
  }

  const days = 5;
  const slots = settings.timeslots_per_day;

  // นำเข้า CSV ตาม PDF: teacher_id, teacher_name
  function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    parseCSV(file, (rows) => {
      const imported = rows
        .map((r) => {
          const name = r.teacher_name || "";
          if (!name) return null;

          return {
            id: uid("t"),                   // ไม่ใช้ teacher_id จากไฟล์
            name,
            max_per_day: 4,                 // default
            unavailable: []
          };
        })
        .filter(Boolean);

      const newList = [...teachers, ...imported];
      setTeachers(newList);
      persist(newList);

      alert("นำเข้าข้อมูลครูเรียบร้อย");
      e.target.value = "";
    });
  }

  function isUnavailable(day, slot) {
    return form.unavailable.some(
      (u) => u.day === day && u.slot === slot
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">จัดการครู</h2>

      <div className="grid grid-cols-2 gap-4">

        {/* FORM */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">
            {editing ? "แก้ไขครู" : "เพิ่มครูใหม่"}
          </h3>

          <input
            className="w-full p-2 border mb-2"
            placeholder="ชื่อครู"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* คาบสูงสุด */}
          <div className="mb-3">
            <label className="block font-semibold mb-1">
              จำนวนคาบสูงสุดที่สอนได้ใน 1 วัน
            </label>

            <select
              className="w-full p-2 border rounded"
              value={form.max_per_day}
              onChange={(e) =>
                setForm({ ...form, max_per_day: Number(e.target.value) })
              }
            >
              <option value="">-- เลือกจำนวนคาบ --</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} คาบต่อวัน</option>
              ))}
            </select>
          </div>

          {/* เวลาที่ไม่ว่าง */}
          <div className="mt-3">
            <div className="font-semibold mb-1">เวลาที่ไม่ว่าง</div>

            <table className="border-collapse border border-slate-400 text-center w-full text-sm">
              <thead>
                <tr>
                  <th className="border p-1 bg-slate-100">วัน / คาบ</th>
                  {Array.from({ length: slots }).map((_, i) => (
                    <th key={i} className="border p-1 bg-slate-100">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: days }).map((_, day) => (
                  <tr key={day}>
                    <td className="border p-1 bg-blue-50">{dayNames[day]}</td>
                    {Array.from({ length: slots }).map((_, slot) => {
                      const off = isUnavailable(day, slot);
                      return (
                        <td
                          key={slot}
                          className={
                            "border p-1 cursor-pointer " +
                            (off ? "bg-rose-500 text-white" : "bg-white")
                          }
                          onClick={() => toggleUnavailable(day, slot)}
                        >
                          {off ? "×" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="btn bg-blue-600 w-full mt-3"
            onClick={handleSave}
          >
            {editing ? "บันทึก" : "เพิ่มครู"}
          </button>

          {/* ปุ่มนำเข้า CSV */}
          <label className="btn bg-green-600 w-full mt-2 cursor-pointer text-center">
            📂 นำเข้าไฟล์ teachers.csv
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleImportCSV}
            />
          </label>
        </div>

        {/* รายการครู */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">รายการครู</h3>

          <div className="space-y-2 max-h-96 overflow-auto text-sm">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="p-2 border rounded flex justify-between items-start"
              >
                <div>
                  <div className="font-semibold text-base">{t.name}</div>
                  <div className="text-slate-500">
                    คาบสูงสุดต่อวัน: {t.max_per_day || 0}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="btn bg-yellow-400 text-xs"
                    onClick={() => handleEdit(t)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="btn bg-rose-500 text-xs"
                    onClick={() => handleDelete(t.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {teachers.length === 0 && (
              <div className="text-slate-500 text-sm">
                ยังไม่มีข้อมูลครู
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
