export const SOUL_WISDOM_BASE_CASES = [
  { name: "Asha Rao", birthDate: "1994-08-17", birthTime: "06:35", birthPlace: "Mumbai", phone: "+919000000001", email: "asha@example.com" },
  { name: "Kabir Mehta", birthDate: "1988-02-03", birthTime: "21:10", birthPlace: "Delhi", phone: "+919000000002", email: "kabir@example.com" },
  { name: "Naina Kapoor", birthDate: "2001-11-28", birthTime: "14:45", birthPlace: "Bengaluru", phone: "+919000000003", email: "naina@example.com" },
  { name: "Rohan Iyer", birthDate: "1979-05-09", birthTime: "04:20", birthPlace: "Chennai", phone: "+919000000004", email: "rohan@example.com" },
  { name: "Meera Shah", birthDate: "1999-12-31", birthTime: "23:58", birthPlace: "Ahmedabad", phone: "+919000000005", email: "meera@example.com" }
];

export const SOUL_WISDOM_EXTENDED_CASES = [
  ...SOUL_WISDOM_BASE_CASES,
  { name: "Ishaan Bedi", birthDate: "1968-01-14", birthTime: "05:05", birthPlace: "Kolkata", phone: "+919000000006", email: "ishaan@example.com" },
  { name: "Tara Menon", birthDate: "1983-07-22", birthTime: "12:18", birthPlace: "Kochi", phone: "+919000000007", email: "tara@example.com" },
  { name: "Devika Sinha", birthDate: "1991-03-06", birthTime: "19:42", birthPlace: "Lucknow", phone: "+919000000008", email: "devika@example.com" },
  { name: "Arjun Nair", birthDate: "2004-09-19", birthTime: "02:11", birthPlace: "Hyderabad", phone: "+919000000009", email: "arjun@example.com" },
  { name: "Samar Qureshi", birthDate: "1974-12-02", birthTime: "16:27", birthPlace: "Jaipur", phone: "+919000000010", email: "samar@example.com" },
  { name: "Leela Verma", birthDate: "1986-04-30", birthTime: "08:52", birthPlace: "Pune", phone: "+919000000011", email: "leela@example.com" },
  { name: "Mira Das", birthDate: "1996-10-11", birthTime: "00:34", birthPlace: "Guwahati", phone: "+919000000012", email: "mira@example.com" },
  { name: "Vivaan Malhotra", birthDate: "1971-06-25", birthTime: "23:03", birthPlace: "Chandigarh", phone: "+919000000013", email: "vivaan@example.com" },
  { name: "Anika Pillai", birthDate: "2002-02-15", birthTime: "10:49", birthPlace: "Coimbatore", phone: "+919000000014", email: "anika@example.com" },
  { name: "Pranav Joshi", birthDate: "1980-11-04", birthTime: "17:16", birthPlace: "Varanasi", phone: "+919000000015", email: "pranav@example.com" },
  { name: "Zoya Khan", birthDate: "1997-05-27", birthTime: "03:39", birthPlace: "Bhopal", phone: "+919000000016", email: "zoya@example.com" },
  { name: "Aditya Sen", birthDate: "1959-08-08", birthTime: "13:07", birthPlace: "Patna", phone: "+919000000017", email: "aditya@example.com" },
  { name: "Kavya Desai", birthDate: "1993-01-29", birthTime: "22:25", birthPlace: "Surat", phone: "+919000000018", email: "kavya@example.com" },
  { name: "Neel Reddy", birthDate: "1989-09-03", birthTime: "06:02", birthPlace: "Nagpur", phone: "+919000000019", email: "neel@example.com" },
  { name: "Ritika Bose", birthDate: "1977-03-21", birthTime: "18:58", birthPlace: "Indore", phone: "+919000000020", email: "ritika@example.com" }
];

export function getSoulWisdomQualityCases(caseSet = "base") {
  if (caseSet === "base") return SOUL_WISDOM_BASE_CASES;
  if (caseSet === "extended") return SOUL_WISDOM_EXTENDED_CASES;

  throw new Error(`Unknown Soul Guru quality case set "${caseSet}". Use base or extended.`);
}
