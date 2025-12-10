import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(false);

  const emptyForm = {
    id: "",
    name: "",
    capacity: 0,
    room_type: "",
    room_tag: ""
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const d = loadData();
    setRooms(d.rooms || []);
  }, []);

  function persist(list) {
    const d = loadData();
    d.rooms = list;
    saveData(d);
  }

  function handleSave() {
    if (!form.name) return alert("กรุณากรอกชื่อห้องเรียน");

    const item = { ...form, id: form.id || uid("room") };
    const newList = [
      ...rooms.filter((r) => r.id !== item.id),
      item
    ];
    setRooms(newList);
    persist(newList);
    setForm(emptyForm);
    setEditing(false);
  }

  function handleEdit(room) {
    setForm(room);
    setEditing(true);
  }

  function handleDelete(id) {
    if (!confirm("ต้องการลบห้องเรียนนี้หรือไม่?")) return;
    const newList = rooms.filter((r) => r.id !== id);
    setRooms(newList);
    persist(newList);
  }

  // นำเข้า CSV ตาม PDF: room_id, room_name
  function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    parseCSV(file, (rows) => {
      const imported = rows
        .map((r) => ({
          id: uid("room"),          // ไม่ใช้ room_id จากไฟล์
          name: r.room_name || "",
          capacity: 40,             // default
          room_type: "classroom",   // default
          room_tag: ""              // default
        }))
        .filter((r) => r.name);

      const newList = [...rooms, ...imported];
      setRooms(newList);
      persist(newList);

      alert("นำเข้าห้องเรียนเรียบร้อย");
      e.target.value = "";
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">จัดการห้องเรียน</h2>

      <div className="grid grid-cols-2 gap-4">

        {/* form */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">
            {editing ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียนใหม่"}
          </h3>

          {/* ชื่อห้อง */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">ชื่อห้อง / รหัสห้อง</label>
            <input
              className="w-full p-2 border rounded"
              placeholder="เช่น 421, ห้องคอม 1, ห้องวิทย์ 2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* ความจุ */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">ความจุห้อง (จำนวนคน)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              placeholder="เช่น 40"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: Number(e.target.value) })
              }
            />
          </div>

          {/* ประเภทห้อง */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">ประเภทห้อง</label>
            <select
              className="w-full p-2 border rounded"
              value={form.room_type}
              onChange={(e) =>
                setForm({ ...form, room_type: e.target.value })
              }
            >
              <option value="">-- เลือกประเภทห้อง --</option>
              <option value="classroom">ห้องเรียนปกติ</option>
              <option value="lab">ห้องปฏิบัติการ</option>
              <option value="special">ห้องเฉพาะทาง</option>
            </select>
          </div>

          {/* room_tag */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">Room Tag</label>
            <input
              className="w-full p-2 border rounded"
              placeholder="เช่น computer, network"
              value={form.room_tag}
              onChange={(e) =>
                setForm({ ...form, room_tag: e.target.value })
              }
            />
          </div>

          <button
            className="btn bg-blue-600 w-full"
            onClick={handleSave}
          >
            {editing ? "บันทึก" : "เพิ่มห้องเรียน"}
          </button>

          {/* ปุ่มนำเข้า CSV */}
          <label className="btn bg-green-600 w-full mt-2 cursor-pointer text-center">
            📂 นำเข้าไฟล์ rooms.csv
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleImportCSV}
            />
          </label>
        </div>

        {/* list */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">รายการห้องเรียน</h3>

          <div className="space-y-2 max-h-96 overflow-auto text-sm">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="p-2 border rounded flex justify-between items-start"
              >
                <div>
                  <div className="font-semibold text-base">{r.name}</div>
                  <div className="text-slate-500">
                    ความจุ: {r.capacity || 0} คน
                  </div>
                  <div className="text-slate-500">
                    ประเภทห้อง: {r.room_type || "-"}
                  </div>
                  <div className="text-slate-500">
                    Room Tag: {r.room_tag || "-"}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="btn bg-yellow-400 text-xs"
                    onClick={() => handleEdit(r)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="btn bg-rose-500 text-xs"
                    onClick={() => handleDelete(r.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="text-slate-500 text-sm">
                ยังไม่มีข้อมูลห้องเรียน
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
