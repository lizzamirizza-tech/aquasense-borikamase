
#include <Arduino.h>

// =======================
// PIN SENSOR TURBIDITY
// =======================
#define TURBIDITY_PIN 32

// =======================
// VARIABEL TURBIDITY
// =======================
float clearVoltage = 0;

// =======================
// BACA SENSOR TURBIDITY
// =======================
float readTurbidity() {

  long sum = 0;

  const int samples = 30;

  for (int i = 0; i < samples; i++) {
    sum += analogRead(TURBIDITY_PIN);
    delay(5);
  }

  float adc_avg = sum / (float)samples;

  float voltage =
    adc_avg * (3.3 / 4095.0);

  float ntu =
    (clearVoltage - voltage) * 300.0;

  if (ntu < 0) {
    ntu = 0;
  }

  if (ntu > 1000) {
    ntu = 1000;
  }

  return ntu;
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
// KALIBRASI AIR JERNIH
// =======================
void calibrateClearWater() {

  long sum = 0;

  const int samples = 30;

  for (int i = 0; i < samples; i++) {
    sum += analogRead(TURBIDITY_PIN);
    delay(5);
  }

  clearVoltage =
    (sum / (float)samples) * (3.3 / 4095.0);

  Serial.print("Clear Voltage: ");
  Serial.println(clearVoltage, 3);
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
  Serial.println("PENGUJIAN SENSOR KEKERUHAN");
  Serial.println("Sensor: DFRobot SEN0189");
  Serial.println("Pin: GPIO 32");

  Serial.println();
  Serial.println("Siapkan air jernih untuk kalibrasi.");
  Serial.println("Tekan ENTER setelah air siap.");

  waitForEnter();

  calibrateClearWater();

  Serial.println();
  Serial.println("Jumlah sampel: 3");
  Serial.println("Pengukuran: 10 kali per sampel");
  Serial.println("==============================");
}

// =======================
// LOOP
// =======================
void loop() {

  static int sampleNumber = 1;

  if (sampleNumber > 3) {
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

    float ntu = readTurbidity();

    total += ntu;

    Serial.print("Pengukuran ke-");
    Serial.print(i + 1);
    Serial.print(" : ");
    Serial.print(ntu, 2);
    Serial.println(" NTU");

    delay(500);
  }

  float average = total / 10.0;

  Serial.println("------------------------------");
  Serial.print("Rata-rata kekeruhan sampel ke-");
  Serial.print(sampleNumber);
  Serial.print(" : ");
  Serial.print(average, 2);
  Serial.println(" NTU");
  Serial.println("==============================");

  sampleNumber++;
}
