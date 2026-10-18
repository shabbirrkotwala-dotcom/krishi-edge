const crypto = require("crypto");

/**
 * Calculates SHA-256 hash matching the patent-aligned ESP32 mbedtls implementation:
 * SHA256(recordNumber|timestamp|temp|hum|mkt_value|ethylene_ppm|pdm_kurtosis|state|action|confidence|previousHash)
 */
function calculateSHA256(recordData) {
  const tempStr = Number(recordData.temperature !== undefined ? recordData.temperature : 0).toFixed(1);
  const humStr = Number(recordData.humidity !== undefined ? recordData.humidity : 0).toFixed(1);
  const mktStr = Number(recordData.mkt_value !== undefined ? recordData.mkt_value : recordData.temperature || 0).toFixed(2);
  const ethStr = Number(recordData.ethylene_ppm !== undefined ? recordData.ethylene_ppm : 0.0).toFixed(2);
  const pdmStr = Number(recordData.pdm_kurtosis !== undefined ? recordData.pdm_kurtosis : 3.0).toFixed(2);

  const recordString =
    `${recordData.recordNumber}|` +
    `${recordData.timestamp}|` +
    `${tempStr}|` +
    `${humStr}|` +
    `${mktStr}|` +
    `${ethStr}|` +
    `${pdmStr}|` +
    `${recordData.state}|` +
    `${recordData.action}|` +
    `${recordData.confidence}|` +
    `${recordData.previousHash}`;

  return crypto
    .createHash("sha256")
    .update(recordString)
    .digest("hex")
    .toUpperCase();
}

/**
 * Calculates Arrhenius Mean Kinetic Temperature (MKT)
 * Delta_H / R = 83.144 kJ/mol / 0.0083144 kJ/(mol*K) = 10000.0 K
 * MKT = (Delta_H / R) / ( -ln( (1/n) * sum( exp(-Delta_H / (R * T_k)) ) ) )
 */
function calculateMKT(tempArrayC, deltaH_over_R = 10000.0) {
  if (!tempArrayC || tempArrayC.length === 0) return 4.0;
  let sumExp = 0.0;
  for (let i = 0; i < tempArrayC.length; i++) {
    const kelvin = tempArrayC[i] + 273.15;
    sumExp += Math.exp(-deltaH_over_R / kelvin);
  }
  const avgExp = sumExp / tempArrayC.length;
  const mktKelvin = deltaH_over_R / (-Math.log(avgExp));
  return +(mktKelvin - 273.15).toFixed(2);
}

/**
 * Evaluates raw temperature & humidity readings using the ESP32 Condition Engine rules:
 * - LOWER_LIMIT = 2.0°C, UPPER_LIMIT = 8.0°C
 * - Excursion < 2 minutes (120s) -> WARNING (action: VERIFY, confidence: 85%)
 * - Excursion >= 2 minutes -> HOLD (action: HOLD_VERIFY, confidence: 95%)
 * - Temp < 2.0°C -> FREEZE_RISK (action: HOLD_VERIFY, confidence: 95%)
 * - 2.0°C <= Temp <= 8.0°C -> NORMAL (action: CONTINUE, confidence: 95%)
 */
function evaluateConditionState(temp, humidity, excursionStartMs = null) {
  const LOWER_LIMIT = 2.0;
  const UPPER_LIMIT = 8.0;
  const WARNING_DURATION_MS = 2 * 60 * 1000; // 2 minutes

  let state = "NORMAL";
  let action = "CONTINUE";
  let confidence = 95;
  let excursionActive = false;
  let newExcursionStart = excursionStartMs;

  if (temp < LOWER_LIMIT) {
    state = "FREEZE_RISK";
    action = "HOLD_VERIFY";
    confidence = 95;
    excursionActive = false;
    newExcursionStart = null;
  } else if (temp >= LOWER_LIMIT && temp <= UPPER_LIMIT) {
    state = "NORMAL";
    action = "CONTINUE";
    confidence = 95;
    excursionActive = false;
    newExcursionStart = null;
  } else {
    // Temperature > UPPER_LIMIT (excursion)
    excursionActive = true;
    if (!newExcursionStart) {
      newExcursionStart = Date.now();
    }
    const duration = Date.now() - newExcursionStart;

    if (duration < WARNING_DURATION_MS) {
      state = "WARNING";
      action = "VERIFY";
      confidence = 85;
    } else {
      state = "HOLD";
      action = "HOLD_VERIFY";
      confidence = 95;
    }
  }

  return { state, action, confidence, excursionActive, excursionStartMs: newExcursionStart };
}

/**
 * Verifies cryptographic hash chain integrity for an array of passport log records.
 * Returns detailed verification report indicating valid / tampered status.
 */
function verifyPassportChain(records) {
  if (!records || records.length === 0) {
    return {
      isValid: true,
      totalRecords: 0,
      verifiedCount: 0,
      message: "No records to verify.",
      issues: [],
    };
  }

  const issues = [];
  let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    // 1. Check previous hash continuity
    if (rec.previousHash !== expectedPrevHash) {
      issues.push({
        recordNumber: rec.recordNumber,
        index: i,
        error: `Previous hash mismatch at record #${rec.recordNumber}. Expected: ${expectedPrevHash}, Found: ${rec.previousHash}`,
      });
    }

    // 2. Re-compute current hash
    const computedHash = calculateSHA256(rec);

    if (computedHash !== rec.currentHash) {
      issues.push({
        recordNumber: rec.recordNumber,
        index: i,
        error: `Hash verification failed for record #${rec.recordNumber}. Expected SHA-256: ${computedHash}, Found: ${rec.currentHash}`,
      });
    }

    // Next record's previousHash should match this record's currentHash
    expectedPrevHash = rec.currentHash;
  }

  const isValid = issues.length === 0;

  return {
    isValid,
    totalRecords: records.length,
    verifiedCount: records.length - issues.length,
    message: isValid
      ? `Cryptographic verification PASSED: All ${records.length} records in passport ledger are authentic & untampered.`
      : `Cryptographic verification FAILED: Found ${issues.length} tampered/mismatched record(s).`,
    issues,
  };
}

module.exports = {
  calculateSHA256,
  calculateMKT,
  evaluateConditionState,
  verifyPassportChain,
};
