#include <Arduino.h>
#include <math.h>

// =======================
// PIN SENSOR TDS
// =======================
#define TDS_PIN 33

// =======================
// BACA SENSOR TDS
// =======================
float readTDS() {

  int analogValue = analogRead(TDS_PIN);

  float voltage = analogValue * (3.3 / 4095.0);

  float ec =
    (133.42 * pow(voltage, 3)
    - 255.86 * pow(voltage, 2)
    + 857.39 * voltage) / 1000.0;

  float temperature = 25.0;

  float compensationCoefficient =
    1.0 + 0.02 * (temperature - 25.0);

  ec = ec / compensationCoefficient;

  float calibrationFactor = 1.0;

  float tds = ec * 500.0 * calibrationFactor;

  return tds;
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
  Serial.println("PENGUJIAN SENSOR TDS");
  Serial.println("Sensor TDS");
  Serial.println("Pin: GPIO 33");
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

    float tds = readTDS();

    total += tds;

    Serial.print("Pengukuran ke-");
    Serial.print(i + 1);
    Serial.print(" : ");
    Serial.print(tds, 2);
    Serial.println(" ppm");

    delay(500);
  }

  float average = total / 10.0;

  Serial.println("------------------------------");
  Serial.print("Rata-rata TDS sampel ke-");
  Serial.print(sampleNumber);
  Serial.print(" : ");
  Serial.print(average, 2);
  Serial.println(" ppm");

  Serial.println("==============================");

  sampleNumber++;
}
