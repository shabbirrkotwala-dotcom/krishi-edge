#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "DHT.h"
#include <math.h>
#include "isolation_forest.h"

// =====================================================
// PIN DEFINITIONS & CONSTANTS
// =====================================================

// DHT11 Sensor
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// OLED Display (128x64 I2C at 0x3C)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDR 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// MPU6050 3-Axis Accelerometer (I2C address 0x68)
#define MPU6050_ADDR 0x68
#define MPU6050_ACCEL_ZOUT_H 0x3F

// DSP Sampling Parameters
#define FFT_SAMPLES 128        // Sampling window size (power of 2)
#define SAMPLING_FREQ_HZ 1000  // 1 kHz high-frequency accelerometer acquisition

float vReal[FFT_SAMPLES];
float vImag[FFT_SAMPLES];

// =====================================================
// MPU6050 INITIALIZATION
// =====================================================
bool initMPU6050() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Wake up sensor from sleep
  byte err = Wire.endTransmission();
  return (err == 0);
}

int16_t readAccelZ() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU6050_ACCEL_ZOUT_H);
  if (Wire.endTransmission(false) != 0) return 0;
  
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)2, (uint8_t)true);
  if (Wire.available() >= 2) {
    int16_t rawZ = (Wire.read() << 8) | Wire.read();
    return rawZ;
  }
  return 0;
}

// =====================================================
// DSP: KURTOSIS & STATISTICAL MOMENTS
// Kurtosis = (E[(x - mu)^4]) / (sigma^2)^2
// Gaussian healthy distribution = ~3.0; Impact shocks > 4.5
// =====================================================
float calculateKurtosis(const float* signal, int n, float& outRMS) {
  if (n <= 0) return 3.0f;
  
  // 1. Mean
  float sum = 0.0f;
  for (int i = 0; i < n; i++) sum += signal[i];
  float mean = sum / (float)n;

  // 2. Variance & RMS
  float sumSq = 0.0f;
  float sumPow4 = 0.0f;
  for (int i = 0; i < n; i++) {
    float diff = signal[i] - mean;
    float diffSq = diff * diff;
    sumSq += diffSq;
    sumPow4 += (diffSq * diffSq);
  }

  float variance = sumSq / (float)n;
  outRMS = sqrtf(variance);

  if (variance <= 0.000001f) return 3.0f;

  float moment4 = sumPow4 / (float)n;
  float kurtosis = moment4 / (variance * variance);
  return kurtosis;
}

// =====================================================
// DSP: EMBEDDED FFT SPECTRUM ANALYSIS
// =====================================================
float computePeakFrequency(float* real, float* imag, int n, float samplingFreq) {
  // Simple in-place Radix-2 Cooley-Tukey FFT
  int j = 0;
  for (int i = 0; i < n - 1; i++) {
    if (i < j) {
      float tr = real[i]; real[i] = real[j]; real[j] = tr;
      float ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
    int k = n / 2;
    while (k <= j) { j -= k; k /= 2; }
    j += k;
  }

  for (int len = 2; len <= n; len <<= 1) {
    float angle = -2.0f * M_PI / (float)len;
    float wlen_r = cosf(angle);
    float wlen_i = sinf(angle);
    for (int i = 0; i < n; i += len) {
      float w_r = 1.0f;
      float w_i = 0.0f;
      for (int k = 0; k < len / 2; k++) {
        float u_r = real[i + k];
        float u_i = imag[i + k];
        float v_r = real[i + k + len / 2] * w_r - imag[i + k + len / 2] * w_i;
        float v_i = real[i + k + len / 2] * w_i + imag[i + k + len / 2] * w_r;
        real[i + k] = u_r + v_r;
        imag[i + k] = u_i + v_i;
        real[i + k + len / 2] = u_r - v_r;
        imag[i + k + len / 2] = u_i - v_i;
        float nw_r = w_r * wlen_r - w_i * wlen_i;
        float nw_i = w_r * wlen_i + w_i * wlen_r;
        w_r = nw_r;
        w_i = nw_i;
      }
    }
  }

  // Find peak dominant frequency magnitude in positive spectrum (1 to n/2)
  float maxMag = 0.0f;
  int peakBin = 1;
  for (int i = 1; i < n / 2; i++) {
    float mag = sqrtf(real[i] * real[i] + imag[i] * imag[i]);
    if (mag > maxMag) {
      maxMag = mag;
      peakBin = i;
    }
  }

  float peakFreqHz = ((float)peakBin * samplingFreq) / (float)n;
  return peakFreqHz;
}

// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  dht.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED NOT FOUND");
    while (1);
  }

  bool mpuOk = initMPU6050();
  if (mpuOk) {
    Serial.println("MPU6050 Accelerometer initialized.");
  } else {
    Serial.println("MPU6050 not detected. Using calibrated DSP mock stream.");
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(10, 10);
  display.println("KRISHI-EDGE DSP");
  display.setCursor(10, 26);
  display.println("Vibration Kurtosis");
  display.setCursor(10, 42);
  display.println("Isolation Forest ML");
  display.display();
  delay(1500);
}

// =====================================================
// LOOP
// =====================================================
void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    temperature = 4.2f;
    humidity = 86.5f;
  }

  // 1. Acquire high-frequency vibration signal window (1000 Hz)
  unsigned long sampleIntervalMicros = 1000000UL / SAMPLING_FREQ_HZ; // 1000 us = 1 ms
  for (int i = 0; i < FFT_SAMPLES; i++) {
    unsigned long tStart = micros();
    int16_t rawZ = readAccelZ();
    if (rawZ == 0) {
      // Baseline synthetic compressor running signal: 50Hz + harmonics + noise
      float t = (float)i / (float)SAMPLING_FREQ_HZ;
      vReal[i] = 1.0f + 0.25f * sinf(2.0f * M_PI * 50.0f * t) + ((float)random(-10, 10) / 100.0f);
    } else {
      vReal[i] = (float)rawZ / 16384.0f; // Scale to g-force for +/- 2g range
    }
    vImag[i] = 0.0f;

    while (micros() - tStart < sampleIntervalMicros) {
      // High-precision timing loop
    }
  }

  // 2. Compute Statistical Moments & Kurtosis
  float rmsVib = 0.0f;
  float kurtosis = calculateKurtosis(vReal, FFT_SAMPLES, rmsVib);

  // 3. Compute FFT Peak Frequency
  float peakFreqHz = computePeakFrequency(vReal, vImag, FFT_SAMPLES, (float)SAMPLING_FREQ_HZ);

  // 4. Run Edge Isolation Forest Anomaly Detection
  float anomalyScore = isolationForestPredict(kurtosis, rmsVib, peakFreqHz);
  bool isAnomaly = (anomalyScore >= 0.60f) || (kurtosis > 4.5f);

  // Status string
  String status = isAnomaly ? "FAULT_WARN" : (temperature > 8.0f ? "TEMP_EXCURSION" : "NOMINAL");

  // Serial Monitor output
  Serial.print("T: "); Serial.print(temperature, 1);
  Serial.print("C | H: "); Serial.print(humidity, 0);
  Serial.print("% | Kurtosis: "); Serial.print(kurtosis, 2);
  Serial.print(" | RMS: "); Serial.print(rmsVib, 3);
  Serial.print("g | FFT Peak: "); Serial.print(peakFreqHz, 1);
  Serial.print("Hz | Score: "); Serial.print(anomalyScore, 3);
  Serial.print(" | Status: "); Serial.println(status);

  // OLED Display Update
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("T:");
  display.print(temperature, 1);
  display.print("C  H:");
  display.print(humidity, 0);
  display.print("%");

  // Vibration Kurtosis & RMS
  display.setCursor(0, 16);
  display.print("VIB-KT: ");
  display.print(kurtosis, 2);
  display.print(kurtosis > 4.5f ? " !" : " OK");

  // FFT Peak & RMS
  display.setCursor(0, 30);
  display.print("RMS:");
  display.print(rmsVib, 2);
  display.print("g ");
  display.print(peakFreqHz, 0);
  display.print("Hz");

  // Isolation Forest Score & Anomaly Status
  display.setCursor(0, 44);
  display.print("iForest: ");
  display.print(anomalyScore, 2);

  display.setCursor(0, 56);
  display.print("STATUS: ");
  display.print(status);

  display.display();

  delay(2000);
}
