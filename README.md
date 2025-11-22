# Backend Setup and Usage Guide

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the `backend` folder with the following content:

```
PORT=5000
MONGODB_URI=mongodb+srv://jaiakashv_db_user:QRySbeeadGaxIl0Q@cluster0.9outrlq.mongodb.net/inlighnx?retryWrites=true&w=majority
NODE_ENV=development
```

**Note:** Replace `inlighnx` with your preferred database name if needed.

## Step 3: Run the Backend Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## Step 4: Add Data to MongoDB

You have **3 ways** to add certificate data:

### Method 1: Using Seed Script (Quick Test Data)

This will add the sample certificate (ITID00001) to your database:

```bash
npm run seed
```

### Method 2: Using POST API Endpoint (Single Certificate)

Use any HTTP client (Postman, Thunder Client, curl, etc.) to POST data:

**Endpoint:** `POST http://localhost:5000/api/verify`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "internId": "ITID00002",
  "name": "John Doe",
  "domain": "Web Development",
  "duration": 3,
  "startingDate": "15-12-2024",
  "completionDate": "15-03-2025",
  "email": "john.doe@example.com"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:5000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "internId": "ITID00002",
    "name": "John Doe",
    "domain": "Web Development",
    "duration": 3,
    "startingDate": "15-12-2024",
    "completionDate": "15-03-2025",
    "email": "john.doe@example.com"
  }'
```

### Method 2b: Using Bulk POST API Endpoint (Multiple Certificates)

**Endpoint:** `POST http://localhost:5000/api/verify/bulk`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "certificates": [
    {
      "internId": "ITID00002",
      "name": "John Doe",
      "domain": "Web Development",
      "duration": 3,
      "startingDate": "15-12-2024",
      "completionDate": "15-03-2025",
      "email": "john.doe@example.com"
    },
    {
      "internId": "ITID00003",
      "name": "Jane Smith",
      "domain": "Data Analyst",
      "duration": 1,
      "startingDate": "15-12-2024",
      "completionDate": "15-01-2025"
    }
  ]
}
```

**Response (Partial Success Example):**
```json
{
  "success": true,
  "message": "Processed 2 certificates. 2 successful, 0 failed, 0 skipped.",
  "results": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "skipped": 0
  }
}
```

**Response (With Errors):**
```json
{
  "success": true,
  "message": "Processed 3 certificates. 2 successful, 1 failed, 0 skipped.",
  "results": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "skipped": 0
  },
  "details": {
    "successful": [
      { "index": 1, "internId": "ITID00002", "name": "John Doe" },
      { "index": 2, "internId": "ITID00003", "name": "Jane Smith" }
    ],
    "failed": [
      {
        "index": 3,
        "internId": "ITID00004",
        "errors": ["Name is required"]
      }
    ],
    "skipped": []
  }
}
```

**Features:**
- ✅ Processes up to 1000 certificates at once
- ✅ Continues processing even if some fail
- ✅ Returns detailed results for each certificate
- ✅ Skips duplicates automatically
- ✅ Validates all data before inserting
- ✅ No 500 errors - all errors are handled gracefully

**Date Formats Supported:**
- DD-MM-YYYY (e.g., "15-12-2024")
- YYYY-MM-DD (e.g., "2024-12-15")

### Method 3: Direct MongoDB Insert

You can also insert data directly into MongoDB Atlas using the MongoDB Compass or Atlas UI.

## Step 5: Verify Certificate

**Endpoint:** `GET http://localhost:5000/api/verify/:internId`

**Example:**
```bash
curl http://localhost:5000/api/verify/ITID00001
```

## API Endpoints

### POST /api/verify
Add a new certificate

**Request Body:**
```json
{
  "internId": "string (required)",
  "name": "string (required)",
  "domain": "string (required)",
  "duration": "number (required)",
  "startingDate": "string (required, DD-MM-YYYY or YYYY-MM-DD)",
  "completionDate": "string (required, DD-MM-YYYY or YYYY-MM-DD)",
  "email": "string (optional)"
}
```

### POST /api/verify/bulk
Add multiple certificates at once (up to 1000)

**Request Body:**
```json
{
  "certificates": [
    {
      "internId": "string (required)",
      "name": "string (required)",
      "domain": "string (required)",
      "duration": "number (required)",
      "startingDate": "string (required, DD-MM-YYYY or YYYY-MM-DD)",
      "completionDate": "string (required, DD-MM-YYYY or YYYY-MM-DD)",
      "email": "string (optional)"
    }
  ]
}
```

**Response:**
- Returns detailed results showing successful, failed, and skipped certificates
- Continues processing even if some certificates fail
- No 500 errors - all errors are handled gracefully

### GET /api/verify/:internId
Get certificate details by Intern ID

**Response:**
```json
{
  "valid": true,
  "Name": "VELUGULA D",
  "Domain": "Data Analyst",
  "Duration": 1,
  "Intern ID": "ITID00001",
  "Starting Date": "15-12-2024",
  "Completion Date": "15-01-2025"
}
```

## Troubleshooting

1. **Connection Error:** Make sure your MongoDB Atlas IP whitelist includes `0.0.0.0/0` (or your current IP)
2. **Port Already in Use:** Change the PORT in `.env` file
3. **Module Not Found:** Run `npm install` again

