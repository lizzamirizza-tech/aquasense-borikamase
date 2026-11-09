
#include <Arduino.h>

// =======================
// PIN SENSOR pH
// =======================
#define PH_PIN 34

// =======================
// KALIBRASI pH
// =======================
float calibration_value = 11.60 + 3.4;

int buffer_arr[10];
int temp;

// =======================
// BACA SENSOR pH
// =======================
float readPH() {

  unsigned long int avgval = 0;

  for (int i = 0; i < 10; i++) {
    buffer_arr[i] = analogRead(PH_PIN);
    delay(30);
  }

  // Urutkan nilai ADC
  for (int i = 0; i < 9; i++) {
    for (int j = i + 1; j < 10; j++) {
      if (buffer_arr[i] > buffer_arr[j]) {
        temp = buffer_arr[i];
        buffer_arr[i] = buffer_arr[j];
        buffer_arr[j] = temp;
      }
    }
  }

  // Rata-rata 6 nilai tengah
  for (int i = 2; i < 8; i++) {
    avgval += buffer_arr[i];
  }

  float volt =
    (float)avgval * 3.3 / 4095.0 / 6;

  return -5.70 * volt + calibration_value;
}

// =======================
// MENUNGGU ENTER
// =======================
void waitForEnter() {

  while (Serial.available()) {
    Serial.read();
  }

  while (!Serial.available()) {
    delay(10);
  }

  Serial.readStringUntil('\n');
}

// =======================
// SETUP
// =======================
void setup() {

  Serial.begin(9600);
  Serial.setTimeout(1000);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Serial.println();
  Serial.println("PENGUJIAN SENSOR pH");
  Serial.println("Sensor: DFRobot SEN0161-V2");
  Serial.println("Pin: GPIO 34");
  Serial.println("Jumlah sampel: 5");
  Serial.println("Pengukuran: 10 kali per sampel");
  Serial.println("==============================");
}

// =======================
// LOOP
// =======================
void loop() {

  static int sampleNumber = 1;

  if (sampleNumber > 5) {
    Serial.println();
    Serial.println("SELURUH PENGUJIAN SELESAI.");
    while (true) {
      delay(1000);
    }
  }

  Serial.println();
  Serial.print("Sampel ke-");
  Serial.println(sampleNumber);

  Serial.println("Masukkan sampel dan tunggu pembacaan stabil.");
  Serial.println("Tekan ENTER untuk mulai pengukuran.");

  waitForEnter();

  float total = 0;

  for (int i = 0; i < 10; i++) {

    float ph = readPH();

    total += ph;

    Serial.print("Pengukuran ke-");
    Serial.print(i + 1);
    Serial.print(" : ");
    Serial.println(ph, 2);

    delay(500);
  }

  float average = total / 10.0;

  Serial.println("------------------------------");
  Serial.print("Rata-rata pH sampel ke-");
  Serial.print(sampleNumber);
  Serial.print(" : ");
  Serial.println(average, 2);
  Serial.println("==============================");

  sampleNumber++;
}
