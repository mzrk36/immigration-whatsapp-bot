# ImmiWings WhatsApp Bot - Complete Project Overview

## 1. What is this Project?
This project is an enterprise-grade WhatsApp Chatbot built for **ImmiWings by Ahmed & Associates**, an immigration and visa consulting firm. It serves as a 24/7 digital frontline agent that interacts with clients on WhatsApp. 

Built on Node.js using the OpenWA API, the bot intelligently combines rule-based numeric menus with advanced AI (Mistral AI), automated data entry (Google Sheets), and a custom-built web dashboard for human agents.

---

## 2. What Problem is it Solving?
Immigration consulting firms often receive a massive influx of inquiries on WhatsApp every day. Many of these inquiries are repetitive, basic questions about services, eligibility, and pricing.

* **Manual Overload:** Without automation, human agents spend countless hours answering basic questions and manually collecting client data.
* **Lead Leakage:** Slow response times during peak hours or off-hours lead to lost potential clients.
* **Data Organization:** Manually copying customer details from WhatsApp chats into CRMs or spreadsheets is tedious and prone to human error.
* **Context Switching:** Agents struggle to know which customers need immediate attention versus which are just casually browsing.

**The Solution:** 
This bot solves these problems by fully automating the top-of-the-funnel interaction. It guides users through available services, intelligently answers their custom questions, automatically collects their structured application data into a spreadsheet, and only alerts a human agent when the customer explicitly requests one. 

---

## 3. The Biggest Features (Core Pillars)

### A. Strict State-Machine Menu System
* **Numeric Navigation:** Users navigate a multi-layered menu by typing numbers (e.g., "Press 1 for Skilled Immigration", "Press 2 for Canada").
* **Persistent Sessions:** The bot tracks exactly where a user is in the menu structure, ensuring a logical flow. If the server restarts, sessions are saved in `sessions.json` to prevent users from losing their place.

### B. Automated Lead Generation & Google Sheets Sync
* **13-Step Questionnaire:** When a user selects "I Want to Apply", the bot switches into Lead Generation mode and asks a series of 13 questions one by one (e.g., Education, Work Experience, Current Occupation/Designation, Highest Level of Education, Relatives Abroad, Additional Info).
* **Instant CRM Sync:** Once the user answers the final question, the bot uses a Google Service Account to instantly append the collected data as a new row in a centralized Google Sheet. 

### C. Mistral AI Fallback (RAG System)
* **Intelligent Guardrails:** If a user ignores the numeric menu and asks a custom question (e.g., "Do you do student visas for the UK?"), the bot doesn't break. Instead, it triggers Mistral AI.
* **Custom Knowledge Base:** The AI is fed a highly specific `knowledge.json` file containing company info, services, limitations, and 100 pre-defined Q&As. 
* **Menu Redirection:** The AI is prompted to answer the user's question conversationally and then guide them back to the correct numeric menu option to continue the flow.

### D. Premium Human Handoff & Web Dashboard
* **Smart Triggers:** Users can select the "Talk to a Human" option or simply type keywords like "human" or "agent".
* **Owner Alerts:** The bot pauses the AI (switching the chat state to `WAITING`) and instantly sends a WhatsApp message to the business owner with a direct link to the chat.
* **Custom Dashboard:** The project includes a beautifully designed, mobile-responsive web dashboard (accessible via password). Here, the owner can:
  * View all active conversations.
  * Filter for customers who are "Waiting".
  * Switch the conversation from `AI Mode` to `HUMAN Mode` (which locks the AI out).
  * Chat directly with the customer from their browser.

---

## 4. Technical Architecture Summary
* **Backend:** Node.js & Express.js.
* **WhatsApp Provider:** OpenWA API communicating via webhooks.
* **AI Provider:** Mistral AI API (`mistral-small-latest`).
* **Database/Storage:** 
  * `sessions.json` for persistent user state.
  * Google Sheets API for lead storage.
  * `knowledge.json` for AI context.
* **Dashboard Frontend:** Vanilla HTML, CSS, and JS (no heavy frameworks), designed with modern glassmorphism aesthetics and real-time polling to keep the chat UI synced.
* **Hosting Design:** Designed to run 24/7 on a VPS (like DigitalOcean) using `pm2` process manager, with built-in deduplication locks to prevent double-replies to webhooks.
