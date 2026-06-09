/* data.jsx — mock pet records for the prototype */

const PETS = [
  {
    id: "luna",
    name: "Luna",
    species: "dog",
    emoji: "🐶",
    breed: "Golden Retriever",
    gender: "f",
    birth: "2021-04-12",
    age: "5 yr",
    weight: "28.4",
    tint: "#E8A87C",
    fav: true,
    status: "ok",          // ok | soon | due
    lastCheckup: "3 weeks ago",
    nextVaccine: "Oct 2026",
    notes: "Loves the lake. Mild seasonal allergies in spring — watch for paw licking.",
  },
  {
    id: "miso",
    name: "Miso",
    species: "cat",
    emoji: "🐱",
    breed: "Scottish Fold",
    gender: "m",
    birth: "2022-09-30",
    age: "3 yr",
    weight: "4.6",
    tint: "#7BAFD4",
    fav: false,
    status: "soon",
    lastCheckup: "5 months ago",
    nextVaccine: "Jul 2026",
    notes: "Indoor only. Dental cleaning recommended at next visit.",
  },
  {
    id: "pip",
    name: "Pip",
    species: "dog",
    emoji: "🐕",
    breed: "Corgi",
    gender: "m",
    birth: "2019-01-08",
    age: "7 yr",
    weight: "12.1",
    tint: "#5B8A6E",
    fav: true,
    status: "due",
    lastCheckup: "13 months ago",
    nextVaccine: "Overdue",
    notes: "Senior wellness plan. Monitor joints — started glucosamine.",
  },
  {
    id: "olive",
    name: "Olive",
    species: "cat",
    emoji: "🐈",
    breed: "Tabby",
    gender: "f",
    birth: "2023-06-21",
    age: "2 yr",
    weight: "3.9",
    tint: "#6BBF8E",
    fav: false,
    status: "ok",
    lastCheckup: "1 month ago",
    nextVaccine: "Dec 2026",
    notes: "Spayed. Curious and healthy. Microchipped.",
  },
];

const CHECKUPS = {
  luna: [
    {
      id: "c1", date: "May 18, 2026", reason: "Annual wellness exam",
      vet: "Dr. Amara Reyes", clinic: "Brookside Animal Hospital",
      weight: "28.4 kg", temp: "38.4 °C", diagnosis: "Healthy — all clear",
      notes: "Bright, alert, responsive. Heart and lungs normal. Recommended dental check in 6 months.",
      meds: [
        { name: "NexGard", dose: "1 chew", freq: "Monthly", dur: "Ongoing" },
        { name: "Apoquel", dose: "16 mg", freq: "Once daily", dur: "30 days" },
      ],
    },
    {
      id: "c2", date: "Jan 12, 2026", reason: "Vaccination — DHPP booster",
      vet: "Dr. Liam Cho", clinic: "Brookside Animal Hospital",
      weight: "27.9 kg", temp: "38.2 °C", diagnosis: "Routine vaccination",
      notes: "No adverse reaction observed. Next booster due in 1 year.",
      meds: [],
    },
  ],
  miso: [
    {
      id: "c3", date: "Jan 03, 2026", reason: "Dental consultation",
      vet: "Dr. Amara Reyes", clinic: "Brookside Animal Hospital",
      weight: "4.6 kg", temp: "38.6 °C", diagnosis: "Mild tartar — cleaning advised",
      notes: "Grade 1 dental disease. Scheduled professional cleaning. Otherwise healthy.",
      meds: [{ name: "Revolution Plus", dose: "1 dose", freq: "Monthly", dur: "Ongoing" }],
    },
  ],
  pip: [
    {
      id: "c4", date: "May 2025", reason: "Senior wellness panel",
      vet: "Dr. Liam Cho", clinic: "Brookside Animal Hospital",
      weight: "12.1 kg", temp: "38.3 °C", diagnosis: "Early arthritis (hips)",
      notes: "Started joint support. Recommend bloodwork every 6 months. Weight management plan.",
      meds: [
        { name: "Glucosamine", dose: "500 mg", freq: "Once daily", dur: "Ongoing" },
        { name: "Galliprant", dose: "20 mg", freq: "Once daily", dur: "As needed" },
      ],
    },
  ],
  olive: [
    {
      id: "c5", date: "May 06, 2026", reason: "Kitten wellness + spay follow-up",
      vet: "Dr. Amara Reyes", clinic: "Brookside Animal Hospital",
      weight: "3.9 kg", temp: "38.5 °C", diagnosis: "Healthy — recovered well",
      notes: "Incision healed cleanly. Microchip confirmed. All vaccines up to date.",
      meds: [],
    },
  ],
};

const EXAMS = {
  luna: [
    { id: "e1", date: "May 18, 2026", name: "Complete Blood Count (CBC)", lab: "IDEXX Reference Lab",
      result: "Within normal range", files: ["CBC_results.pdf", "chem_panel.pdf"] },
  ],
  miso: [
    { id: "e2", date: "Jan 03, 2026", name: "Dental X-Ray", lab: "In-house imaging",
      result: "Grade 1 — monitor", files: ["dental_xray.jpg"] },
  ],
  pip: [
    { id: "e3", date: "May 2025", name: "Senior Bloodwork Panel", lab: "IDEXX Reference Lab",
      result: "Slightly elevated ALP", files: ["bloodwork.pdf", "urinalysis.pdf"] },
    { id: "e4", date: "Nov 2024", name: "Hip Radiograph", lab: "In-house imaging",
      result: "Mild degenerative change", files: ["hip_xray.jpg"] },
  ],
  olive: [],
};

const STATUS_LABEL = {
  ok:   { label: "Up to date", cls: "status-ok" },
  soon: { label: "Checkup due soon", cls: "status-soon" },
  due:  { label: "Checkup overdue", cls: "status-due" },
};

Object.assign(window, { PETS, CHECKUPS, EXAMS, STATUS_LABEL });
