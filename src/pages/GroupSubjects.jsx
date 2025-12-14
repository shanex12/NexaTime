import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";

/**
 * จัดการความสัมพันธ์ระหว่างกลุ่มเรียน (group_id) กับวิชา (subject_id)
 * ใช้ข้อมูลจากไฟล์ register.csv ที่มีหัวคอลัมน์:
 *   group_id,subject_id
 * เก็บลง localStorage ในคีย์: groupSubjects
 */
export default function GroupSubjects() {
  const [mappings, setMappings] = useState([]);   // [{id, group_id, subject_id}]
  const [groups, setGroups] = useState([]);       // มาจาก classGroups
  const [subjects, setSubjects] = useState([]);   // มาจาก subjects

  const [form, setForm] = useState({
    id: "",
    group_id: "",
    subject_id: ""
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const d = loadData();
    setGroups(d.classGroups || []);
    setSubjects(d.subjects || []);
    setMappings(d.groupSubjects || []);
  }, []);

  function persist(list) {
    const d = loadData();
    d.groupSubjects = list;
    saveData(d);
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!form.group_id || !form.subject_id) {
      return alert("กรุณาเลือกกลุ่มเรียนและวิชาให้ครบก่อน");
    }

    // กันซ้ำ (กรณีเพิ่มใหม่ หรือแก้ไขแล้วเปลี่ยนค่า)
    const dup = mappings.find(
      (m) =>
        m.group_id === form.group_id &&
        m.subject_id === form.subject_id &&
        m.id !== form.id
    );
    if (dup) {
      return alert("ความสัมพันธ์ระหว่างกลุ่มเรียนและวิชานี้มีอยู่แล้ว");
    }

    const id = form.id || uid("gs");
    const item = {
      id,
      group_id: form.group_id,
      subject_id: form.subject_id
    };

    const newList = [
      ...mappings.filter((m) => m.id !== id),
      item
    ];

    setMappings(newList);
    persist(newList);
    setForm({ id: "", group_id: "", subject_id: "" });
    setEditing(false);
  }

  function handleEdit(m) {
    setForm({
      id: m.id,
      group_id: m.group_id,
      subject_id: m.subject_id
    });
    setEditing(true);
  }

  function handleDelete(id) {
    if (!confirm("ต้องการลบวิชานี้ออกจากกลุ่มเรียนใช่หรือไม่?")) return;
    const newList = mappings.filter((m) => m.id !== id);
    setMappings(newList);
    persist(newList);
  }

  function handleCancel() {
    setForm({ id: "", group_id: "", subject_id: "" });
    setEditing(false);
  }

  // นำเข้า CSV: group_id,subject_id
  function handleImportCSV(e) {
  const input = e.target;            // ✅ เก็บ input
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (ev) => {
    const csvText = ev.target.result; // ✅ string

    parseCSV(csvText, (rows) => {
      console.log("Import register .csv rows:", rows);
      const importedRows = rows
        .map((r) => ({
          group_id: (r.group_id || "").trim(),
          subject_id: (r.subject_id || "").trim()
        }))
        .filter((r) => r.group_id && r.subject_id);

      const merged = [...mappings];

      for (const row of importedRows) {
        const exists = merged.some(
          (m) =>
            m.group_id === row.group_id &&
            m.subject_id === row.subject_id
        );

        if (!exists) {
          merged.push({
            id: uid("gs"),
            ...row
          });
        }
      }

      setMappings(merged);
      persist(merged);
      alert("นำเข้าข้อมูล register.csv เรียบร้อย");

      input.value = "";              // ✅ reset ได้จริง
    });
  };

  reader.readAsText(file, "utf-8");
}

  // helper เอาไว้แสดงชื่อกลุ่ม / ชื่อวิชาให้ดูรู้เรื่อง
  function getGroupLabel(group_id) {
    const g =
      groups.find((x) => x.group_id === group_id) ||
      groups.find((x) => x.id === group_id);
    if (!g) return group_id;
    if (g.group_id && g.name && g.group_id !== g.name) {
      return `${g.group_id} – ${g.name}`;
    }
    return g.name || g.group_id || group_id;
  }

  function getSubjectLabel(subject_id) {
    const s =
      subjects.find((x) => x.subject_id === subject_id) ||
      subjects.find((x) => x.id === subject_id);
    if (!s) return subject_id;
    if (s.subject_id && s.name && s.subject_id !== s.name) {
      return `${s.subject_id} – ${s.name}`;
    }
    return s.name || s.subject_id || subject_id;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        จัดการวิชาที่เรียนในแต่ละกลุ่มเรียน (register.csv)
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* ฝั่งซ้าย: ฟอร์ม + ปุ่มนำเข้า CSV */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">
            {editing
              ? "แก้ไขความสัมพันธ์กลุ่มเรียน – วิชา"
              : "เพิ่มความสัมพันธ์กลุ่มเรียน – วิชา"}
          </h3>

          {/* เลือกกลุ่มเรียน */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">กลุ่มเรียน</label>
            <select
              className="w-full p-2 border rounded"
              value={form.group_id}
              onChange={(e) => handleChange("group_id", e.target.value)}
            >
              <option value="">-- เลือกกลุ่มเรียน --</option>
              {groups.map((g) => {
                const value = g.group_id || g.id;
                return (
                  <option key={g.id} value={value}>
                    {getGroupLabel(value)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* เลือกวิชา */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">วิชา</label>
            <select
              className="w-full p-2 border rounded"
              value={form.subject_id}
              onChange={(e) =>
                handleChange("subject_id", e.target.value)
              }
            >
              <option value="">-- เลือกวิชา --</option>
              {subjects.map((s) => {
                const value = s.subject_id || s.id;
                return (
                  <option key={s.id} value={value}>
                    {getSubjectLabel(value)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ปุ่มบันทึก / ยกเลิก */}
          <div className="flex gap-2 mb-4">
            <button
              className="btn bg-blue-600 flex-1"
              onClick={handleSave}
            >
              {editing ? "บันทึก" : "เพิ่ม"}
            </button>
            {editing && (
              <button
                className="btn bg-gray-400 flex-1"
                onClick={handleCancel}
              >
                ยกเลิก
              </button>
            )}
          </div>

          {/* นำเข้า CSV */}
          <div className="border-t pt-3 mt-3">
            <label className="btn bg-green-600 cursor-pointer">
              📂 เลือกไฟล์ register.csv
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleImportCSV}
              />
            </label>
          </div>
        </div>

        {/* ฝั่งขวา: รายการ mapping */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">
            รายการวิชาในแต่ละกลุ่มเรียน
          </h3>

          <div className="max-h-96 overflow-auto space-y-2 text-sm">
            {mappings.map((m) => (
              <div
                key={m.id}
                className="p-2 border rounded flex justify-between items-start"
              >
                <div>
                  <div className="font-semibold">
                    กลุ่ม: {getGroupLabel(m.group_id)}
                  </div>
                  <div className="text-slate-600">
                    วิชา: {getSubjectLabel(m.subject_id)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                    onClick={() => handleEdit(m)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(m.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {mappings.length === 0 && (
              <div className="text-slate-500 text-sm">
                ยังไม่ได้กำหนดวิชาให้กลุ่มเรียนใด ๆ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
