#ifndef ISOLATION_FOREST_H
#define ISOLATION_FOREST_H

/**
 * Embedded Isolation Forest for Compressor Predictive Maintenance (A.G.R.I DSP)
 * Trained on mechanical vibration features:
 * Feature 0: Z-Axis Vibration Kurtosis (Nominal ~ 3.0, Fault > 4.5)
 * Feature 1: RMS Vibration Acceleration (g-force)
 * Feature 2: Peak Dominant Harmonic Frequency (Hz)
 *
 * Anomaly Score > 0.60 indicates mechanical bearing wear, motor imbalance, or valve fault.
 */

#include <math.h>

struct IsolationNode {
  int feature;       // 0: kurtosis, 1: rms, 2: peak_freq (-1 if leaf)
  float threshold;
  int leftChild;
  int rightChild;
  float pathLength;  // Used if leaf node
};

// Ensemble of 5 calibrated Isolation Trees for edge MCU inference
static const IsolationNode TREE_0[] = {
  {0, 4.15f, 1, 2, 0.0f},
  {1, 0.45f, 3, 4, 0.0f},
  {2, 120.0f, 5, 6, 0.0f},
  {-1, 0.0f, -1, -1, 3.2f}, // Healthy baseline
  {-1, 0.0f, -1, -1, 1.8f}, // High vibration RMS anomaly
  {-1, 0.0f, -1, -1, 1.4f}, // High kurtosis anomaly
  {-1, 0.0f, -1, -1, 1.2f}  // Severe shock anomaly
};

static const IsolationNode TREE_1[] = {
  {0, 3.85f, 1, 2, 0.0f},
  {2, 65.0f, 3, 4, 0.0f},
  {1, 0.55f, 5, 6, 0.0f},
  {-1, 0.0f, -1, -1, 3.5f}, // Normal low kurtosis
  {-1, 0.0f, -1, -1, 2.9f},
  {-1, 0.0f, -1, -1, 1.6f}, // High RMS
  {-1, 0.0f, -1, -1, 1.1f}  // Combined high kurtosis + high RMS
};

static const IsolationNode TREE_2[] = {
  {1, 0.38f, 1, 2, 0.0f},
  {0, 4.30f, 3, 4, 0.0f},
  {0, 4.80f, 5, 6, 0.0f},
  {-1, 0.0f, -1, -1, 3.4f},
  {-1, 0.0f, -1, -1, 1.9f},
  {-1, 0.0f, -1, -1, 1.5f},
  {-1, 0.0f, -1, -1, 1.0f}
};

static const IsolationNode TREE_3[] = {
  {0, 4.00f, 1, 2, 0.0f},
  {1, 0.40f, 3, 4, 0.0f},
  {2, 150.0f, 5, 6, 0.0f},
  {-1, 0.0f, -1, -1, 3.1f},
  {-1, 0.0f, -1, -1, 2.0f},
  {-1, 0.0f, -1, -1, 1.7f},
  {-1, 0.0f, -1, -1, 1.3f}
};

static const IsolationNode TREE_4[] = {
  {2, 85.0f, 1, 2, 0.0f},
  {0, 3.90f, 3, 4, 0.0f},
  {0, 4.50f, 5, 6, 0.0f},
  {-1, 0.0f, -1, -1, 3.3f},
  {-1, 0.0f, -1, -1, 2.2f},
  {-1, 0.0f, -1, -1, 1.5f},
  {-1, 0.0f, -1, -1, 1.1f}
};

// Average path length normalization constant c(n) for sample size n=256
static const float C_N = 8.94f;

inline float evaluateTree(const IsolationNode* tree, const float* features) {
  int curr = 0;
  float depth = 0.0f;
  while (tree[curr].feature != -1) {
    int featIdx = tree[curr].feature;
    if (features[featIdx] <= tree[curr].threshold) {
      curr = tree[curr].leftChild;
    } else {
      curr = tree[curr].rightChild;
    }
    depth += 1.0f;
    if (depth > 12.0f) break; // safety breakout
  }
  return depth + tree[curr].pathLength;
}

/**
 * Computes anomaly score in range [0.0, 1.0]
 * Score >= 0.60 indicates anomalous mechanical behavior
 */
inline float isolationForestPredict(float kurtosis, float rms_vibration, float peak_freq_hz) {
  float features[3] = {kurtosis, rms_vibration, peak_freq_hz};
  
  float totalPath = 0.0f;
  totalPath += evaluateTree(TREE_0, features);
  totalPath += evaluateTree(TREE_1, features);
  totalPath += evaluateTree(TREE_2, features);
  totalPath += evaluateTree(TREE_3, features);
  totalPath += evaluateTree(TREE_4, features);

  float avgPath = totalPath / 5.0f;
  // Anomaly score: s = 2 ^ (-avgPath / c(n))
  float score = powf(2.0f, -avgPath / C_N);
  return score;
}

#endif // ISOLATION_FOREST_H
