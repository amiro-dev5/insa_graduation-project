# FixIt
### Find a trusted technician in minutes

[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Django](https://img.shields.io/badge/Backend-Django%206%20%7C%20DRF-092e20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Chapa](https://img.shields.io/badge/Payment-Chapa-00c087)](https://chapa.co/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285f4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

# 🎥 DEMO VIDEO: see the `video/` folder
# 🎥 DEMO VIDEO: WATCH THE FULL SYSTEM ON YOUTUBE

## **▶️ [CLICK HERE https://youtu.be/8APnTTocWv4]**

**The complete screen recording of the FixIt system is available on YouTube. Click the link above to watch it.**

**The original video file (` is too large for GitHub, so it is hosted on YouTube. The `video/` folder in this project also contains a README with the same link.**

**What the video shows:**
- **Customer flow:** register, find verified technicians, send one request to up to 3 technicians, track the job and leave a review.
- **Technician flow:** register with a TVET certificate, receive requests, accept a job and publish posts on the community feed.
- **Service wallet:** Chapa top-up and the automatic 50 ETB fee when a job is accepted.
- **Trilingual interface:** English, Amharic and Afaan Oromo, with light and dark themes.
- **AI support chatbot:** answers FixIt questions only.
- **Admin back-office:** certificate review and account suspension.



It walks through the whole system: customer and technician flows, Chapa wallet top-up, the 50 ETB fee, the trilingual interface, the AI chatbot and the admin back-office.

---

## What is FixIt?

FixIt is a home service marketplace for Ethiopia. Customers find **verified technicians** (electricians, plumbers, carpenters, painters, appliance repair and more) in their own city, send one request to up to **3 technicians**, and the first to accept gets the job.

FixIt solves three everyday problems:
- Customers cannot tell who is skilled and trustworthy.
- Technicians have no way to show their work or reach new customers.
- Hiring through informal brokers is slow, unsafe and unpredictable.

FixIt is built as a **startup and graduation project** (INSA Summer Camp MVP). It runs in **English, Amharic and Afaan Oromo**.

## Key Features

- **Verified technicians:** TVET certificates are reviewed by an admin before a technician is listed.
- **Privacy first:** customer phone and address stay hidden until a technician accepts.
- **Community feed:** technicians post advice and finished work, and users can like posts.
- **Ratings and reviews** after every completed job.
- **AI support chatbot (Google Gemini):** answers questions about FixIt in all three languages and refuses anything unrelated to FixIt.
- **Service wallet (Chapa):** see below.

## Wallet and Commission

Technicians keep a prepaid **Service Wallet** in ETB.

1. The technician tops up the wallet through **Chapa** (test mode). The balance is credited automatically and an electronic receipt is issued.
2. When a technician **accepts a request**, FixIt checks the wallet has at least **50 ETB**.
3. If yes, exactly **50 ETB** is deducted (this is FixIt's commission) and the customer's phone and address are revealed.
4. If not, acceptance is blocked and the technician is asked to top up.

FixIt takes no percentage of the job price. The technician keeps 100% of what the customer pays for the work.

## Tech Stack

| Part | Technology |
| :--- | :--- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query |
| Backend | Python 3.12, Django 6, Django REST Framework, SimpleJWT |
| Database | SQLite (dev), PostgreSQL (production) |
| Payments | Chapa |
| AI | Google Gemini |

## Installation

**Requirements:** Python 3.10+, Node.js 18+, Git

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # Linux/macOS: cp .env.example .env
```

Open `.env` and add your keys (`SECRET_KEY`, `CHAPA_SECRET_KEY`, `GEMINI_API_KEYS`). Then:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_fixit_data      # optional demo data
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/` | Admin: `http://127.0.0.1:8000/admin/`

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env         # Linux/macOS: cp .env.example .env
npm run dev
```

App: `http://localhost:5173/`

## Tests

```bash
cd backend
python manage.py test
```

## Roadmap

USSD and SMS access, mobile apps, live GPS, real-time messaging, escrow payments.

## License

MIT. See `LICENSE`.

---

*FixIt: trusted tradespeople for every home, dignified work for every technician.*