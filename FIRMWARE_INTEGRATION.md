# Firmware Engineer Integration Guide
## RadiGuard — Device-to-Server Communication

**System:** RadiGuard Radiation Exposure Monitoring Platform  
**Document version:** 1.0  
**Date:** 2026-04-17  
**Author:** RadiGuard Engineering

---

## 1. Overview

The dosimeter hardware device is responsible for:
1. Reading radiation dose data from the sensor (in **millisieverts, mSv**)
2. Associating the reading with the correct **radiologist card number**
3. Transmitting the reading to the RadiGuard backend over HTTP
4. Using its provisioned **API key** to authenticate every transmission

The backend handles all threshold evaluation, anomaly detection, alerting, and reporting. The firmware has **one primary job**: reliably deliver accurate readings to a single endpoint.

---

## 2. Network Requirements

| Property | Value |
|----------|-------|
| Protocol | HTTP/1.1 (HTTPS in production) |
| Base URL | `http://<server-host>:5000/api/v1` |
| Content Type | `application/json` |
| Auth Header | `X-API-Key: <device_api_key>` |
| Primary Endpoint | `POST /exposure` |

The device does **not** need to maintain a persistent connection. Each reading is a single fire-and-forget HTTP POST.

---

## 3. Device Identity & Provisioning

Every physical device must be **pre-registered** in the RadiGuard system by an administrator before it can submit data. Registration produces two immutable identifiers that must be stored in the device firmware (e.g., in flash/NVS):

| Field | Example | Description |
|-------|---------|-------------|
| `device_id` | `DEV-MNH-001` | Logical device identifier. Shown in dashboards and reports. Must match exactly what is stored in the database. |
| `api_key` | `rm_dev001apikey12345678901234` | Secret authentication key. **Shown only once** at registration time. Treat as a secret — do not log or transmit in plain text outside of the `X-API-Key` header. |

If the `api_key` is compromised, an administrator can regenerate it via the management dashboard. The device must then be reflashed with the new key.

---

## 4. Submitting a Radiation Reading

### Endpoint

```
POST /api/v1/exposure
```

### Required Headers

```
Content-Type: application/json
X-API-Key: rm_dev001apikey12345678901234
```

### Request Body

```json
{
  "device_id":       "DEV-MNH-001",
  "card_number":     "MNH-RAD-001",
  "radiation_value": 0.023,
  "timestamp":       "2024-03-15T10:30:00Z"
}
```

### Field Reference

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `device_id` | string | Yes | Must match registered device | The hardware device's ID |
| `card_number` | string | Yes | Must match a registered radiologist | The worker's dosimeter card number (read from NFC/RFID/barcode) |
| `radiation_value` | float | Yes | >= 0.0 | Accumulated dose in **millisieverts (mSv)** |
| `timestamp` | string | No | ISO 8601 UTC | Time the reading was taken. Defaults to server receive time if omitted. Include this if the device has an RTC. |

### Successful Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 847,
    "device_id": "DEV-MNH-001",
    "card_number": "MNH-RAD-001",
    "radiation_value": 0.023,
    "unit": "mSv",
    "timestamp": "2024-03-15T10:30:00Z",
    "is_anomaly": 0,
    "threshold_violations": []
  }
}
```

The `is_anomaly` flag and `threshold_violations` array are for informational use — the device does not need to act on them, but they can be used to trigger a local LED or buzzer warning if needed.

---

## 5. Authentication Flow

```
Device                                    Server
  │                                          │
  │  POST /api/v1/exposure                   │
  │  X-API-Key: rm_dev001apikey...           │
  │  { device_id, card_number, value, ts }   │
  │─────────────────────────────────────────►│
  │                                          │ Looks up api_key in devices table
  │                                          │ Checks is_active = 1
  │                                          │ Updates devices.last_seen = NOW()
  │                                          │ Validates request body
  │                                          │ Stores exposure log
  │                                          │ Evaluates thresholds
  │                                          │ Checks for anomalies
  │  HTTP 201 { id, is_anomaly, ... }        │
  │◄─────────────────────────────────────────│
```

**Error cases:**

| HTTP Status | Meaning | Firmware Action |
|-------------|---------|-----------------|
| `401 Unauthorized` | Invalid or missing API key | Stop transmitting; alert operator to reprovision device |
| `400 Bad Request` | Malformed JSON or invalid field values | Log locally; fix firmware logic |
| `404 Not Found` | `card_number` not registered in system | Log locally; user must be registered by admin |
| `429 Too Many Requests` | Rate limit hit (see §7) | Back off and retry (see §8) |
| `500 Internal Server Error` | Server fault | Retry with exponential backoff |

---

## 6. card_number — Worker Identification

The `card_number` field is how the system ties a radiation reading to a specific worker. It must be **accurately identified** at the time of reading. Common implementation patterns:

- **NFC/RFID badge tap:** Worker taps a card; device reads the card number before each session
- **Barcode scan:** Worker scans printed ID badge
- **Keypad entry:** Worker enters an ID code
- **Pre-configured:** Device is dedicated to a single worker; card number is hardcoded in firmware

> **Important:** If the device cannot determine the card number (e.g., no card tapped), do **not** submit a reading. A reading submitted with an unknown or blank `card_number` will be rejected with `400 Bad Request`.

Card number format examples: `MNH-RAD-001`, `AKH-RAD-002`

---

## 7. Rate Limits

The ingestion endpoint enforces a rate limit to protect the server:

| Window | Max Requests | Per |
|--------|-------------|-----|
| 1 minute | 120 requests | Per device API key |

This allows a maximum of **2 readings per second** per device. A typical dosimeter should submit readings no more frequently than **once per minute** per session. Exceeding the limit returns `HTTP 429`.

---

## 8. Error Handling & Retry Logic

The device must handle network failures and server errors gracefully. Recommended strategy:

```
Submit reading
    │
    ├── 2xx ──► Success. Clear local buffer.
    │
    ├── 400/401/404 ──► Do NOT retry (client error).
    │                   Log locally; alert operator.
    │
    ├── 429 ──► Wait for Retry-After header (or default 60 s).
    │           Then retry.
    │
    ├── 5xx ──► Retry with exponential backoff:
    │           Attempt 1: wait 5 s
    │           Attempt 2: wait 15 s
    │           Attempt 3: wait 60 s
    │           Attempt 4: wait 300 s
    │           After 4 failures: queue to local storage.
    │
    └── Timeout/No Network ──► Queue to local storage.
                               Flush queue when connectivity restored.
```

**Local buffering:** If the network is unavailable, queue readings to persistent storage (SPIFFS/LittleFS/SD). When connectivity is restored, submit buffered readings in chronological order, including accurate `timestamp` values. The server will accept readings with past timestamps.

---

## 9. Device Status & Heartbeat

The server infers device health from the `last_seen` timestamp, which is updated automatically on every successful POST to `/exposure`. There is **no separate heartbeat endpoint**.

| Time since last reading | Dashboard Status |
|------------------------|-----------------|
| ≤ 30 minutes | `online` |
| 31 – 120 minutes | `stale` |
| > 120 minutes | `offline` |

Offline status triggers alerts to hospital administrators. To keep the device marked `online` during periods of low radiation activity (no workers present), submit a **zero-value reading** if no real reading is available:

```json
{
  "device_id": "DEV-MNH-001",
  "card_number": "MNH-RAD-001",
  "radiation_value": 0.0,
  "timestamp": "2024-03-15T10:30:00Z"
}
```

Alternatively, implement a 25-minute keep-alive by submitting any queued reading or a 0.0 reading when idle for more than 20 minutes.

---

## 10. Data Units & Precision

| Property | Specification |
|----------|--------------|
| Unit | Millisieverts (**mSv**) |
| Typical per-reading range | 0.001 – 0.100 mSv |
| Maximum single-reading spike threshold | 0.274 mSv (≈ 5× daily limit) |
| Precision | 3 decimal places recommended (e.g., `0.023`) |
| Zero readings | Allowed (`0.0` or `0.000`) |

**Do not convert to µSv or Sv before submitting.** The server always expects mSv.

---

## 11. Example ESP32 Arduino Sketch (Reference)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ── Provisioned per-device (store in NVS in production) ──────────────────────
const char* DEVICE_ID  = "DEV-MNH-001";
const char* API_KEY    = "rm_dev001apikey12345678901234";
const char* SERVER_URL = "http://192.168.1.100:5000/api/v1/exposure";

// ── WiFi credentials ─────────────────────────────────────────────────────────
const char* WIFI_SSID = "HospitalWifi";
const char* WIFI_PASS = "password";

// ── NTP for accurate timestamps ───────────────────────────────────────────────
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET = 3 * 3600;   // EAT = UTC+3

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  configTime(GMT_OFFSET, 0, NTP_SERVER);
}

bool submitReading(const char* cardNumber, float radiationMsv) {
  if (WiFi.status() != WL_CONNECTED) return false;

  // Build ISO 8601 timestamp
  struct tm timeInfo;
  char timestamp[30];
  if (getLocalTime(&timeInfo)) {
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  } else {
    strcpy(timestamp, "");   // Server will use receive time
  }

  // Serialize JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"]       = DEVICE_ID;
  doc["card_number"]     = cardNumber;
  doc["radiation_value"] = round(radiationMsv * 1000.0) / 1000.0;  // 3 dp
  if (strlen(timestamp) > 0) doc["timestamp"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  // HTTP POST
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);
  http.setTimeout(10000);  // 10 s timeout

  int code = http.POST(payload);
  http.end();

  if (code == 201) {
    Serial.printf("Reading submitted: %.3f mSv → card %s\n", radiationMsv, cardNumber);
    return true;
  }

  Serial.printf("Submission failed: HTTP %d\n", code);
  return false;
}

void loop() {
  float doseReading = readSensorMsv();    // Your sensor read function
  const char* cardNumber = readNfcCard(); // Your NFC read function

  if (cardNumber != nullptr) {
    for (int attempt = 0; attempt < 4; attempt++) {
      if (submitReading(cardNumber, doseReading)) break;
      uint32_t backoff[] = {5000, 15000, 60000, 300000};
      delay(backoff[attempt]);
    }
  }

  delay(60000);  // Submit at most once per minute
}
```

---

## 12. Complete Transmission Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DOSIMETER DEVICE                          │
│                                                             │
│  [Sensor] ──► Read dose (mSv) ──► [Validate > 0 check]     │
│                                                             │
│  [NFC/RFID] ──► Read card_number ──► [Validate not empty]   │
│                                                             │
│  [RTC/NTP] ──► Get ISO 8601 UTC timestamp                   │
│                                                             │
│  Build JSON payload:                                        │
│  {                                                          │
│    "device_id":       "DEV-MNH-001",                        │
│    "card_number":     "MNH-RAD-001",                        │
│    "radiation_value": 0.023,                                │
│    "timestamp":       "2024-03-15T10:30:00Z"                │
│  }                                                          │
│                                                             │
│  HTTP POST /api/v1/exposure                                 │
│  Header: X-API-Key: rm_dev001apikey...                      │
│  Header: Content-Type: application/json                     │
└────────────────────────┬────────────────────────────────────┘
                         │ Network
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RADIGUARD SERVER                          │
│                                                             │
│  1. Validate API key  ──► 401 if invalid                    │
│  2. Parse JSON body   ──► 400 if malformed                  │
│  3. Look up card_number ─► 404 if not found                 │
│  4. Store exposure log in database                          │
│  5. Update devices.last_seen = NOW()                        │
│  6. Evaluate dose thresholds (annual/monthly/weekly/daily)  │
│  7. Run anomaly detection (Z-score + spike check)           │
│  8. Create alerts if thresholds exceeded or anomaly found   │
│  9. Return 201 { id, is_anomaly, threshold_violations }     │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Firmware Version Reporting

When registering a device or updating firmware, the administrator can record the firmware version string in the device profile. This is visible on the device management dashboard.

Recommended version string format: `MAJOR.MINOR.PATCH` — e.g., `1.0.0`, `1.2.3`

To update the firmware version field, the administrator uses the management dashboard (no firmware action required — the field is metadata only).

---

## 14. Security Checklist

- [ ] `api_key` stored in encrypted NVS / protected flash partition, not in plain `.h` file
- [ ] HTTPS used in production (TLS certificate validation enabled)
- [ ] Device does not log `api_key` to serial in production builds
- [ ] `device_id` and `api_key` are different per physical unit (no shared keys across devices)
- [ ] Firmware has a secure OTA update mechanism that verifies signatures before applying
- [ ] Default WiFi credentials are removed before deployment
- [ ] If API key is compromised, immediately notify admin to regenerate via dashboard

---

## 15. Quick Reference

```
Endpoint  : POST http://<host>:5000/api/v1/exposure
Auth      : X-API-Key: <api_key>
Body      : { device_id, card_number, radiation_value, timestamp }
Unit      : mSv (millisieverts)
Rate limit: 120 req/min per device (≈ 2/sec)
Success   : HTTP 201
Heartbeat : Submit any reading within 30 min to stay "online"
```

---

*For questions about the server API, contact the backend team. For device registration and API key provisioning, contact the system administrator.*
