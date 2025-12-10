export const storageKey = "rvc_data_v1";

export function loadData() {
  try {
    const raw = localStorage.getItem(storageKey);
    let d = raw ? JSON.parse(raw) : {};

    // ✔ ค่าเริ่มต้นเพื่อป้องกัน error
    if (!d.teachers) d.teachers = [];
    if (!d.subjects) d.subjects = [];
    if (!d.rooms) d.rooms = [];
    if (!d.settings) d.settings = { days: 5, timeslots_per_day: 6 };

    // ✔ เพิ่มกลุ่มเรียน (Class Groups)
    if (!d.classGroups) {
      d.classGroups = [
        "ปวช.1/1", "ปวช.1/2",
        "ปวช.2/1", "ปวช.2/2",
        "ปวช.3/1", "ปวช.3/2"
      ];
    }

    // ✔ ตารางของแต่ละกลุ่มเรียน
    if (!d.allTimetables) {
      d.allTimetables = {};
    }

    return d;

  } catch (e) {
    return {
      teachers: [],
      subjects: [],
      rooms: [],
      settings: { days: 5, timeslots_per_day: 6 },
      classGroups: [
        "ปวช.1/1", "ปวช.1/2",
        "ปวช.2/1", "ปวช.2/2",
        "ปวช.3/1", "ปวช.3/2"
      ],
      allTimetables: {}
    };
  }
}

export function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}
