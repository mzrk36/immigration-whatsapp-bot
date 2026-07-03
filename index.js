require("dotenv").config();   // Load environment variables FIRST

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

/**
 * ====== CONFIG ======
 */
const OPENWA_BASE_URL = process.env.OPENWA_BASE_URL || "http://localhost:2785/api";
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || "";
const OPENWA_SESSION_ID = process.env.OPENWA_SESSION_ID || "";
const OPENWA_WEBHOOK_SECRET = process.env.OPENWA_WEBHOOK_SECRET || "";

// Google Sheets (Service Account)
const GOOGLE_SHEETS_CLIENT_EMAIL =
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "whatsapp-bot-sheets@sustained-path-470608-q0.iam.gserviceaccount.com";
const GOOGLE_SHEETS_PRIVATE_KEY = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCQ4+8WJSkdhfpX\n6W7/+6y7FHGNt1HJhVKKRBYdD9O7BQW4FlEMAr2Ie+Tcd+wHMsiUhI3Th9NUP+Ch\n/ywAECxahyEG8UbL2u0GAyMKH9ScxKugEOfCUYi/MFoPxrzZ1dJjC4Pr9YDNH1lS\ntBHWd3z+oNLDt9hozZcTnb2/6C3xUto/ltA2j9m22acfFS0wLQ5nr+t7Flhfhoij\nU1xH8ThJhScu31MQqTgk6yP7vZR7NpNiOZ3ezzMLKqMT3UULWDGpWyAF7OgVA4Eo\nQZyb8vkPv6HvOKyR87xnWIey4/6vu2c+TxOe27xMeWuqvr9d/Ck6vpcIruhYvqbe\n/K5hk2RHAgMBAAECggEAOTyp6twkOWL/afIv5NTlwAPL9floyEywNim+eJ2TfWp2\n/2lle/KrL/sNhmCjb5aKsU0J//nErKANW8GDfsTk2KBQFj+DQa3K+5iKo4m+gm2Z\nBQMYouV1uV1e/qN6YC19Tp4yb6jMyHttXGQBNfF/AdHDYQjD52bsGxYx6tlMKOwD\nOUnB5RCExF7KcGjmC98R3cOLdVQyF5PYvGtxV4yN+NmLFLgeZRICZSFcD4jC6PqX\n9p1UmEqNBSCSAhhNd46I6Dp2Dz87ocj8ZOQKH0bB/z1CWe3kowJ2jynl3/k1jkk2\nFTG+VtE29F6/eWSbaUwbmO95y3CeM5uSkDmmuiRXAQKBgQDI9XtNq4xbOLeS3Ap9\nmxpGV3bfw6gHp6EobgcWSaQH+zS/YK1tV8TgvJj7GrCm5mcqwDo1DiEu/dMT6t87\nSus+sxIcTdPz9kH/KGiZfKhEwti3uVS+Qz42e2D034BMibx5m9AGDGmSykwQ6H1b\nWXAkdECXLNsaV0lPp6ubxzurRwKBgQC4kyB8oG/vOpsueni2Se1QFjiMleD5dlza\nANHSEH8tnMHBHingfVEOrvq2MS5dkAJq3tOtSN5+lvCpV6bN0NwWbagXahEkpCk8\n6/umfdlE9GAkn4DqOsN9UBXXQ1o6SLIbuXfftcfj1KM7qLpxlxl1z8gKM9uUkqsi\nuMQCJWT/AQKBgA5fOA1K+oO/n6laIUnwYMWtFaxVItxBSc5JaCpY4+lKNvCE6oJK\nZ6Mm+c3jj8Sv76roCoGm3AqvTnw7LPHhnsdiKSZrDoCBGSE1c52eg64/PR6Om5fr\n2TQuSLXakiNnKlqMISl9k8NSwnPnHKf+0n1Y7xGgvJ66pVyUAjrm2cabAoGAd4/u\nymxPNgObxHbXPRYUYP2T8hWgn1g5+4nuYQoIqC5UIFn+vInQ+RcGFwEyzK7dsgbX\nzfdXEV+LU9cQmWBDQVAVQ92Ub0zb3bfr0sTQ+mbm5LJiGtioC8PV8hSSHRE8NtNk\nwIiLjJ0QhDPfWneLqZJIPbur8Mk1jI9tgQpiKwECgYA1/Qd42hOZuH3ZhriZIOK8\nHqoBDdOqJ4kZ59XiMEFPDQmUZZhZ0y2YP5iRMbG4cVhEVKstyANuBGjlnkF7sy27\nrEZrD+8RIhP9ErhUdqKM3N51QCVVLAUYCRSWMVGejD5OgtA/WmeZEAN7770N7a2U\n2wvjm6teJBmXRR3tsyi1SQ==\n-----END PRIVATE KEY-----\n")
  .replace(/\\n/g, "\n");
const GOOGLE_SHEETS_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1nn075Y29hoByPPD1hQnem2zJbE-Qm88qskU1zDBjq2U";
const GOOGLE_SHEETS_LEADS_RANGE =
  process.env.GOOGLE_SHEETS_LEADS_RANGE || "Leads!A2:M";

// Mistral AI Configuration
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";
const INVALID_OPTION_TEXT = "Please choose a valid option from the menu.";

// Load knowledge base
let knowledgeBase = null;
try {
  const knowledgePath = path.join(__dirname, "knowledge.json");
  const knowledgeData = fs.readFileSync(knowledgePath, "utf8");
  knowledgeBase = JSON.parse(knowledgeData);
  console.log("Knowledge base loaded successfully.");
} catch (err) {
  console.error("Error loading knowledge base:", err.message);
}

/**
 * ========= WORKFLOW TEXTS (EXACT) =========
 */

const MAIN_MENU_TEXT = `0️⃣ Main Menu

Welcome to ImmiWing! Your trusted partner for global immigration and visa services.
Please choose the option that best matches your interest:

Buttons:
1️⃣ Skilled Immigration
2️⃣ Business Immigration
3️⃣ Direct Citizenship Programs
4️⃣ Investor’s Immigration
5️⃣ Student Visa (All Countries)
6️⃣ Other Visa Services`;

const SKILLED_IMMIGRATION_TEXT = `--------------------------------------
1️⃣ Skilled Immigration
--------------------------------------

Skilled Immigration allows qualified professionals to settle permanently in top countries based on age, education, experience, language skills, and points system.

It is ideal for people who want:
• Better career opportunities
• Permanent Residency
• High earnings
• Family settlement
• Healthcare + education benefits

Buttons:
1️⃣ Canada
2️⃣ Australia
3️⃣ I Want to Apply
4️⃣ Main Menu`;

const CANADA_SKILLED_TEXT = `🇨🇦 Canada (Skilled Immigration)

Canada offers two main pathways for skilled workers:

① Federal Immigration (Federal Skilled Worker through Express Entry)
② Provincial Nominee Program (PNP)

Buttons:
1️⃣ Federal Skilled Worker
2️⃣ Quebec Skilled Worker
3️⃣ Provincial Nominee Programs
4️⃣ Pilot Programs
5️⃣ I Want to Apply
6️⃣ Main Menu`;

const FEDERAL_SKILLED_WORKER_TEXT = `1️⃣ Federal Skilled Worker

Eligibility:
• Work experience
• Education
• Language skills
• Age & adaptability
• Need 67/100 points

Express Entry process:
Submit your profile → receive CRS score → get invitation → submit application within 60 days.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const QUEBEC_SKILLED_WORKER_TEXT = `2️⃣ Quebec Skilled Worker

Apply through Arrima Portal → get CSQ → apply federally.

Eligibility:
• 50 points (single)
• 59 points (with spouse)

Based on:
Education, experience, language, age, relatives in Quebec, funds.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const PNP_TEXT = `3️⃣ Provincial Nominee Programs

How it works:
Apply to province → get Nomination → apply federally.

Popular PNPs:
Ontario, Alberta, Saskatchewan, Manitoba, Nova Scotia.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const PILOT_PROGRAMS_TEXT = `4️⃣ Pilot Programs

Atlantic Immigration Pilot & Rural/Northern Pilot.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const AUSTRALIA_SKILLED_TEXT = `🇦🇺 Australia (Skilled Immigration)

Points-based system.
EOI → Invitation → Apply in 60 days.

Visa Types:
• 189 Skilled Independent
• 190 Skilled Nominated
• 491 Skilled Regional

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const PERM_SKILLED_AUS_TEXT = `Permanent Skilled Migration Visas (Australia)

Eligibility:
Work experience, education, English skills.

Buttons:
1️⃣ Permanent Skilled Migration Visas
2️⃣ I Want to Apply
3️⃣ Main Menu`;

const BUSINESS_IMMIGRATION_TEXT = `--------------------------------------
2️⃣ Business Immigration
--------------------------------------

Buttons:
1️⃣ Canada
2️⃣ I Want to Apply
3️⃣ Main Menu`;

const CANADA_BUSINESS_TEXT = `🇨🇦 Canada (Business Immigration)

Buttons:
1️⃣ Federal Business Immigration
2️⃣ Provincial Business Immigration
3️⃣ Quebec Business Immigration
4️⃣ I Want to Apply
5️⃣ Main Menu`;

const FEDERAL_BUSINESS_TEXT = `1️⃣ Federal Business Immigration

Programs:
• Self-Employed Program
• Start-Up Visa

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const PROVINCIAL_BUSINESS_TEXT = `2️⃣ Provincial Business Immigration

Invest → manage → create jobs.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const QUEBEC_BUSINESS_TEXT = `3️⃣ Quebec Business Immigration

Programs:
• Self-Employed Worker
• Entrepreneur Program

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const DIRECT_CITIZENSHIP_TEXT = `--------------------------------------
3️⃣ Direct Citizenship Programs
--------------------------------------

Countries:
• Antigua & Barbuda
• Grenada
• St. Kitts & Nevis
• St. Lucia
• Turkey
• Moldova

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const INVESTOR_IMMIGRATION_TEXT = `--------------------------------------
4️⃣ Investor’s Immigration
--------------------------------------

Residency/citizenship via:
• Capital investment
• Real estate
• Business creation

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const STUDENT_VISA_TEXT = `--------------------------------------
5️⃣ Student Visa (All Countries)
--------------------------------------

Countries:
UK, USA, Canada, Australia, New Zealand, Singapore, Ireland, France, Germany, Switzerland, Malaysia.

We assist with:
Admission criteria, essays, resumes, English skills, documentation.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

const OTHER_VISA_TEXT = `--------------------------------------
6️⃣ Other Visa Services
--------------------------------------

Includes:
• Visit Visas
• Super Visa Canada
• Parental Sponsorship Canada
• Job Seeker Visas

We assist with eligibility, documentation, and application success.

Buttons:
1️⃣ I Want to Apply
2️⃣ Main Menu`;

/**
 * ========= WORKFLOW STATE MACHINE =========
 *
 * type: 'STATE'  -> go to another menu node
 * type: 'APPLY'  -> start lead flow
 * type: 'MAIN'   -> go back to main menu
 * type: 'LOOP'   -> stay in same node (for any self-loop)
 */

const WORKFLOW = {
  MAIN_MENU: {
    message: MAIN_MENU_TEXT,
    options: {
      "1": { type: "STATE", next: "SKILLED" },
      "2": { type: "STATE", next: "BUSINESS" },
      "3": { type: "STATE", next: "DIRECT_CITIZENSHIP" },
      "4": { type: "STATE", next: "INVESTOR" },
      "5": { type: "STATE", next: "STUDENT" },
      "6": { type: "STATE", next: "OTHER_VISA" },
    },
  },

  // 1) Skilled Immigration
  SKILLED: {
    message: SKILLED_IMMIGRATION_TEXT,
    options: {
      "1": { type: "STATE", next: "CANADA_SKILLED" },
      "2": { type: "STATE", next: "AUSTRALIA_SKILLED" },
      "3": { type: "APPLY" },
      "4": { type: "MAIN" },
    },
  },
  CANADA_SKILLED: {
    message: CANADA_SKILLED_TEXT,
    options: {
      "1": { type: "STATE", next: "FEDERAL_SKILLED" },
      "2": { type: "STATE", next: "QUEBEC_SKILLED" },
      "3": { type: "STATE", next: "PNP" },
      "4": { type: "STATE", next: "PILOT_PROGRAMS" },
      "5": { type: "APPLY" },
      "6": { type: "MAIN" },
    },
  },
  FEDERAL_SKILLED: {
    message: FEDERAL_SKILLED_WORKER_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  QUEBEC_SKILLED: {
    message: QUEBEC_SKILLED_WORKER_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  PNP: {
    message: PNP_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  PILOT_PROGRAMS: {
    message: PILOT_PROGRAMS_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  AUSTRALIA_SKILLED: {
    message: AUSTRALIA_SKILLED_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  // Optional node – defined but no button leads here in your text
  PERM_SKILLED_AUS: {
    message: PERM_SKILLED_AUS_TEXT,
    options: {
      "1": { type: "LOOP" },
      "2": { type: "APPLY" },
      "3": { type: "MAIN" },
    },
  },

  // 2) Business Immigration
  BUSINESS: {
    message: BUSINESS_IMMIGRATION_TEXT,
    options: {
      "1": { type: "STATE", next: "CANADA_BUSINESS" },
      "2": { type: "APPLY" },
      "3": { type: "MAIN" },
    },
  },
  CANADA_BUSINESS: {
    message: CANADA_BUSINESS_TEXT,
    options: {
      "1": { type: "STATE", next: "FEDERAL_BUSINESS" },
      "2": { type: "STATE", next: "PROV_BUSINESS" },
      "3": { type: "STATE", next: "QUEBEC_BUSINESS" },
      "4": { type: "APPLY" },
      "5": { type: "MAIN" },
    },
  },
  FEDERAL_BUSINESS: {
    message: FEDERAL_BUSINESS_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  PROV_BUSINESS: {
    message: PROVINCIAL_BUSINESS_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
  QUEBEC_BUSINESS: {
    message: QUEBEC_BUSINESS_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },

  // 3) Direct Citizenship Programs
  DIRECT_CITIZENSHIP: {
    message: DIRECT_CITIZENSHIP_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },

  // 4) Investor’s Immigration
  INVESTOR: {
    message: INVESTOR_IMMIGRATION_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },

  // 5) Student Visa
  STUDENT: {
    message: STUDENT_VISA_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },

  // 6) Other Visa Services
  OTHER_VISA: {
    message: OTHER_VISA_TEXT,
    options: {
      "1": { type: "APPLY" },
      "2": { type: "MAIN" },
    },
  },
};

/**
 * ========= GOOGLE SHEETS HELPERS =========
 */
let sheetsClient = null;

async function getSheetsClient() {
  if (
    !GOOGLE_SHEETS_CLIENT_EMAIL ||
    !GOOGLE_SHEETS_PRIVATE_KEY ||
    !GOOGLE_SHEETS_SPREADSHEET_ID
  ) {
    console.warn(
      "Google Sheets credentials are not fully configured. Leads will NOT be written to Sheets."
    );
    return null;
  }

  if (!sheetsClient) {
    try {
      // Ensure private key is properly formatted (handle both env var and hardcoded)
      // Replace escaped newlines with actual newlines (handles env vars that store keys as strings)
      const privateKey = GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
      
      // Validate that we have the required credentials
      if (!GOOGLE_SHEETS_CLIENT_EMAIL || !privateKey || !GOOGLE_SHEETS_SPREADSHEET_ID) {
        throw new Error("Missing required Google Sheets credentials");
      }
      
      const auth = new google.auth.JWT({
        email: GOOGLE_SHEETS_CLIENT_EMAIL,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
      });
      
      await auth.authorize(); // important for 401 debugging
      sheetsClient = google.sheets({ version: "v4", auth });
      console.log("Google Sheets client authorized successfully.");
    } catch (err) {
      console.error("Error authorizing Google Sheets client:", err.message);
      console.error("Full error:", err);
      return null;
    }
  }
  return sheetsClient;
}

async function saveLeadToSheet(lead, whatsappNumber) {
  const sheets = await getSheetsClient();
  if (!sheets) return;

  const row = [
    new Date().toISOString(),
    whatsappNumber || "",
    lead.fullName || "",
    lead.phone || "",
    lead.dob || "",
    lead.countryCity || "",
    lead.highestEducation || "",
    lead.yearsOfEducation || "",
    lead.workExperience || "",
    lead.maritalStatus || "",
    lead.spouseEducation || "",
    lead.spouseProfession || "",
    lead.relativesCanadaAustralia || "",
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: GOOGLE_SHEETS_LEADS_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log("Lead appended to Google Sheet:", whatsappNumber);
  } catch (err) {
    console.error(
      "Error appending to Google Sheet:",
      err.response?.data || err.message
    );
  }
}

/**
 * ========= MISTRAL AI HELPER =========
 */
async function getMistralResponse(userQuestion, session) {
  if (!MISTRAL_API_KEY) {
    console.warn("MISTRAL_API_KEY not configured. AI fallback will be disabled.");
    return null;
  }

  if (!knowledgeBase) {
    console.warn("Knowledge base not loaded. Cannot provide AI response.");
    return null;
  }

  // Get current menu state and available options
  const currentState = session.menuState || "MAIN_MENU";
  const currentNode = WORKFLOW[currentState];
  const currentMenuText = currentNode ? currentNode.message : MAIN_MENU_TEXT;
  
  // Build workflow structure info
  const workflowInfo = `
CURRENT MENU STATE: ${currentState}
CURRENT MENU OPTIONS:
${currentMenuText}

AVAILABLE BUTTONS IN CURRENT MENU:
${Object.entries(currentNode?.options || {}).map(([num, opt]) => {
  const optionText = opt.type === "STATE" ? WORKFLOW[opt.next]?.message.split("\n")[0] || opt.next :
                     opt.type === "APPLY" ? "I Want to Apply (starts lead collection)" :
                     opt.type === "MAIN" ? "Main Menu" : num;
  return `Button ${num}: ${optionText}`;
}).join("\n")}

WORKFLOW STRUCTURE:
- Users navigate using numbered buttons (1, 2, 3, etc.)
- "I Want to Apply" or "Apply" triggers lead collection form
- "Main Menu" or "0" returns to main menu
- Lead collection asks: Full Name, Phone, DOB, Current Country and City, Highest Education, Total Years of Education, Total Work Experience, Marital Status, Spouse Education, Spouse Profession, Relatives in Canada/Australia
- After lead collection, user chooses: Online Meeting or Visit Office`;

  // Build context from knowledge base
  const systemPrompt = `You are a helpful customer service assistant for ImmiWing, an immigration and visa consulting firm. You MUST work WITH the existing menu workflow system.

COMPANY INFORMATION:
${JSON.stringify(knowledgeBase.company_overview, null, 2)}

SERVICES OFFERED:
${JSON.stringify(knowledgeBase.services, null, 2)}

SAMPLE Q&A (Use these as reference):
${Object.values(knowledgeBase.sample_qa).join("\n")}

IMPORTANT NOTES:
${knowledgeBase.caution.join("\n")}

VERIFICATION REMINDERS:
${knowledgeBase.verify_questions.join("\n")}

${workflowInfo}

CRITICAL INSTRUCTIONS:
1. ALWAYS guide users to use the BUTTONS/MENU OPTIONS shown above. Reference the specific button numbers (e.g., "Press button 1" or "Select option 3").
2. If user wants to APPLY or START APPLICATION, tell them to use button "I Want to Apply" or type "I Want to Apply" - this will trigger the lead collection workflow.
3. Answer questions based on knowledge base, but ALWAYS connect answers back to the menu options and buttons.
4. If user asks about a service, guide them to the relevant menu button. For example:
   - Skilled Immigration → Button 1 in Main Menu
   - Business Immigration → Button 2 in Main Menu
   - Student Visa → Button 5 in Main Menu
   - etc.
5. Keep responses concise and WhatsApp-friendly (2-3 short paragraphs max).
6. Always end with guidance on which button to press (e.g., "Press button 1 to learn more" or "Type 'Main Menu' to see all options").
7. Never make guarantees about visa approvals.
8. If user seems confused, show them the current menu options clearly with button numbers.
9. Work WITH the workflow system - don't try to replace it. Guide users through the menu structure.
10. If user is already in a submenu, reference the buttons available in that specific menu.`;

  try {
    const response = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      {
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userQuestion
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          "Authorization": `Bearer ${MISTRAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }
  } catch (err) {
    console.error("Error getting Mistral response:", err.response?.data || err.message);
    return null;
  }
}

/**
 * ========= SESSION / STATE =========
 */
const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      menuState: "MAIN_MENU",
      leadStep: null,
      leadData: {},
      meetingState: null,
    };
  }
  return sessions[userId];
}

function isGreeting(text) {
  const t = text.trim().toLowerCase();
  const list = ["hi", "hello", "hey", "salam", "asalam o alaikum", "assalam o alaikum", "assalamu alaikum"];
  return list.some((g) => t === g || t.startsWith(g + " "));
}

function parseNumericOption(text) {
  const match = text.trim().match(/^(\d+)/);
  return match ? match[1] : null;
}

/**
 * Lead form questions (unchanged)
 */
const LEAD_QUESTIONS = [
  { key: "fullName", text: "Please share your Full Name:" },
  { key: "phone", text: "Please share your Phone Number:" },
  { key: "dob", text: "Please share your Date of Birth (DD-MM-YYYY):" },
  { key: "countryCity", text: "Please share your current Country and City of residence:" },
  { key: "highestEducation", text: "What is your highest level of Education? (e.g. Bachelors, Masters, PhD)" },
  { key: "yearsOfEducation", text: "How many years of education do you have in total? (e.g. 14, 16, 18 years)" },
  { key: "workExperience", text: "How many years of total work experience do you have?" },
  { key: "maritalStatus", text: "What is your Marital Status?" },
  {
    key: "spouseEducation",
    text: "What is your Spouse's level of Education? (type N/A if not married or single)",
  },
  {
    key: "spouseProfession",
    text: "What is your Spouse's Profession? (type N/A if not married or single)",
  },
  {
    key: "relativesCanadaAustralia",
    text:
      "Do you and/or your spouse have any relative living in Canada or Australia? If yes, please mention the exact relationship, legal status (e.g. Citizen, PR, Student), and location. If no, type 'No'.",
  },
];

function startLeadFlow(session) {
  session.leadStep = 0;
  session.leadData = {};
}

async function handleLeadFlow(session, userMessage, from) {
  const stepIndex = session.leadStep;

  if (stepIndex !== null && stepIndex < LEAD_QUESTIONS.length) {
    const currentQuestion = LEAD_QUESTIONS[stepIndex];
    session.leadData[currentQuestion.key] = userMessage.trim();
  }

  session.leadStep++;

  if (session.leadStep < LEAD_QUESTIONS.length) {
    const nextQuestion = LEAD_QUESTIONS[session.leadStep];
    return nextQuestion.text;
  }

  // all questions answered
  session.leadStep = null;

  try {
    await saveLeadToSheet(session.leadData, from);
  } catch (err) {
    console.error("Error saving lead:", err.message);
  }

  session.meetingState = "AWAITING_CHOICE";

  return (
    "Your information has been collected.\n\n" +
    "Do you want to set up a 1:1 meeting with us to discuss all the details?\n\n" +
    "1) Online Meeting\n" +
    "2) Visit our Office\n\n" +
    "Please reply with 1 or 2."
  );
}

function handleMeetingChoice(session, userMessage) {
  const num = parseNumericOption(userMessage) || userMessage.trim().toLowerCase();
  let reply;

  if (num === "1" || num.startsWith("online")) {
    reply =
      "Please use this link to book an online appointment:\n" +
      "https://calendly.com/muzamilzrk36/30min";
  } else if (num === "2" || num.includes("office") || num.includes("visit")) {
    reply =
      "You are welcome to visit our office at this location:\n" +
      "https://www.google.com/maps/search/?api=1&query=24.944782,67.057257";
  } else {
    return (
      "Invalid choice.\n\n" +
      "Please reply with:\n" +
      "1) Online Meeting\n" +
      "2) Visit our Office"
    );
  }

  session.meetingState = null;

  return (
    reply +
    '\n\nYou can type "Main Menu" to see all options again.'
  );
}

/**
 * Core handler: strict menu + lead flow
 */
async function handleIncomingText(from, msgBody) {
  const rawText = (msgBody || "").trim();
  const lower = rawText.toLowerCase();
  const session = getSession(from);

  // Global commands
  if (
    lower === "main menu" ||
    lower === "main manu" ||
    lower === "menu" ||
    lower === "0"
  ) {
    session.menuState = "MAIN_MENU";
    session.leadStep = null;
    session.meetingState = null;
    return WORKFLOW.MAIN_MENU.message;
  }

  if (
    lower === "i want to apply" ||
    lower === "i want to apply." ||
    lower === "apply"
  ) {
    startLeadFlow(session);
    return "Great! Let's start your application.\n\n" + LEAD_QUESTIONS[0].text;
  }

  // Lead flow
  if (session.leadStep !== null) {
    return await handleLeadFlow(session, rawText, from);
  }

  // Meeting choice
  if (session.meetingState === "AWAITING_CHOICE") {
    return handleMeetingChoice(session, rawText);
  }

  // First greeting -> main menu
  if (!session.menuState || isGreeting(lower)) {
    session.menuState = "MAIN_MENU";
    return WORKFLOW.MAIN_MENU.message;
  }

  // Menu navigation
  const currentState = session.menuState || "MAIN_MENU";
  const node = WORKFLOW[currentState];

  if (!node) {
    session.menuState = "MAIN_MENU";
    return WORKFLOW.MAIN_MENU.message;
  }

  const optionNumber = parseNumericOption(rawText);

  if (!optionNumber) {
    // No numeric option found - check if user wants to apply
    const wantsToApply = lower.includes("apply") || 
                        lower.includes("application") || 
                        lower.includes("want to apply") ||
                        lower.includes("start application") ||
                        lower.includes("begin application");
    
    if (wantsToApply) {
      // User wants to apply - trigger lead flow
      startLeadFlow(session);
      return "Great! Let's start your application.\n\n" + LEAD_QUESTIONS[0].text;
    }
    
    // Try Mistral AI fallback with session context
    const mistralResponse = await getMistralResponse(rawText, session);
    if (mistralResponse) {
      return mistralResponse;
    }
    return INVALID_OPTION_TEXT;
  }

  const option = node.options[optionNumber];

  if (!option) {
    // Invalid option number - check if user wants to apply
    const wantsToApply = lower.includes("apply") || 
                        lower.includes("application") || 
                        lower.includes("want to apply") ||
                        lower.includes("start application") ||
                        lower.includes("begin application");
    
    if (wantsToApply) {
      // User wants to apply - trigger lead flow
      startLeadFlow(session);
      return "Great! Let's start your application.\n\n" + LEAD_QUESTIONS[0].text;
    }
    
    // Try Mistral AI fallback with session context
    const mistralResponse = await getMistralResponse(rawText, session);
    if (mistralResponse) {
      return mistralResponse;
    }
    return INVALID_OPTION_TEXT;
  }

  if (option.type === "STATE") {
    session.menuState = option.next;
    return WORKFLOW[option.next].message;
  }

  if (option.type === "MAIN") {
    session.menuState = "MAIN_MENU";
    return WORKFLOW.MAIN_MENU.message;
  }

  if (option.type === "APPLY") {
    startLeadFlow(session);
    return "Great! Let's start your application.\n\n" + LEAD_QUESTIONS[0].text;
  }

  if (option.type === "LOOP") {
    // stay in same node
    return node.message;
  }

  // Final fallback - try Mistral AI with session context
  const mistralResponse = await getMistralResponse(rawText, session);
  if (mistralResponse) {
    return mistralResponse;
  }
  return INVALID_OPTION_TEXT;
}

/**
 * ========= WHATSAPP API =========
 */
async function sendMessage(to, message) {
  if (!OPENWA_BASE_URL || !OPENWA_API_KEY || !OPENWA_SESSION_ID) {
    console.error("OpenWA credentials are not fully configured.");
    return;
  }

  try {
    const chatId = to.includes("@") ? to : `${to}@c.us`;
    console.log("Sending reply to chatId:", chatId);

    const response = await axios.post(
      `${OPENWA_BASE_URL}/sessions/${OPENWA_SESSION_ID}/messages/send-text`,
      {
        chatId,
        text: message,
      },
      {
        headers: {
          "X-API-Key": OPENWA_API_KEY,
          "Content-Type": "application/json",
          "X-Request-ID": `req_${Date.now()}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    const chatId = to.includes("@") ? to : `${to}@c.us`;
    console.error("OpenWA send message error:", {
      status: error.response?.status,
      data: error.response?.data,
      chatId,
    });
    throw error;
  }
}

/**
 * ========= EXPRESS ROUTES =========
 */
app.get("/", (req, res) => {
  res.send("WhatsApp Bot Running");
});

app.get("/webhook", (req, res) => {
  res.send("OpenWA webhook endpoint is active");
});

app.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;

    if (payload.event !== "message.received") {
      return res.sendStatus(200);
    }

    const messageData = payload.data || {};

    const from = messageData.from || messageData.chatId;
    const msgBody = messageData.body || messageData.text || "";

    if (!from || !msgBody) {
      console.log("Invalid OpenWA message payload:", payload);
      return res.sendStatus(200);
    }

    if (messageData.isGroup) {
      return res.sendStatus(200);
    }

    console.log("Message from:", from);
    console.log("User said:", msgBody);

    try {
      const replyText = await handleIncomingText(from, msgBody);

      if (replyText) {
        await sendMessage(from, replyText);
      }
    } catch (error) {
      console.error("Error handling message:", error.message);

      try {
        await sendMessage(
          from,
          "I'm currently experiencing technical difficulties. Please try again later or contact ImmiWing directly."
        );
      } catch (openwaError) {
        console.error("Failed to send fallback message:", openwaError.message);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
});

/**
 * ========= START SERVER =========
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  if (MISTRAL_API_KEY) {
    console.log("✅ Mistral AI integration is active.");
  } else {
    console.log("⚠️  Mistral AI is not configured. Set MISTRAL_API_KEY in .env to enable AI fallback.");
  }
});