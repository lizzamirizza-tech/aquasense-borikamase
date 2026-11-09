
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <time.h>
#include <sys/time.h>
#include <esp_sntp.h>

// =======================
// LCD
// =======================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// =======================
// WIFI
// =======================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// =======================
// GOOGLE SHEETS
// =======================
String serverName = "YOUR_GOOGLE_SCRIPT_URL";

// =======================
// MQTT
// =======================
const char* mqtt_server = "192.168.253.144";
const int mqtt_port = 1883;
const char* mqtt_topic = "aquasense/borikamase/water";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// =======================
// PIN SENSOR
// =======================
#define PH_PIN 34
#define TDS_PIN 33
#define TURBIDITY_PIN 32

// =======================
// PIN LED
// =======================
#define LED_MERAH 26
#define LED_PUTIH 25

// =======================
// VARIABEL PH
// =======================
float calibration_value = 11.60 + 3.4;
int buffer_arr[10], temp;
float ph_act;

// =======================
// VARIABEL SENSOR
// =======================
float tdsValue = 0;
float turbidityNTU = 0;
float clearVoltage = 0;

// =======================
// TIMER
// =======================
unsigned long previousMillis = 0;
const long interval = 60000;

// =======================
// STATUS NTP
// =======================
bool ntpSynced = false;
const time_t NTP_VALID_TIME = 1704067200;

// =======================
// PEMERIKSAAN SINKRONISASI SNTP
// =======================
bool checkNTPSync() {
  return esp_sntp_get_sync_status() == SNTP_SYNC_STATUS_COMPLETED;
}

// =======================
// BACA PH
// =======================
float readPH() {

  unsigned long int avgval = 0;

  for (int i = 0; i < 10; i++) {
    buffer_arr[i] = analogRead(PH_PIN);
    delay(30);
  }

  for (int i = 0; i < 9; i++) {
    for (int j = i + 1; j < 10; j++) {
      if (buffer_arr[i] > buffer_arr[j]) {
        temp = buffer_arr[i];
        buffer_arr[i] = buffer_arr[j];
        buffer_arr[j] = temp;
      }
    }
  }

  avgval = 0;

  for (int i = 2; i < 8; i++) {
    avgval += buffer_arr[i];
  }

  float volt = (float)avgval * 3.3 / 4095.0 / 6;

  return -5.70 * volt + calibration_value;
}

// =======================
// BACA TDS
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
// BACA TURBIDITY
// =======================
float readTurbidity() {

  long sum = 0;

  const int samples = 30;

  for (int i = 0; i < samples; i++) {
    sum += analogRead(TURBIDITY_PIN);
    delay(5);
  }

  float adc_avg = sum / (float)samples;

  float voltage = adc_avg * (3.3 / 4095.0);

  float ntu = (clearVoltage - voltage) * 300.0;

  if (ntu < 0) {
    ntu = 0;
  }

  if (ntu > 1000) {
    ntu = 1000;
  }

  return ntu;
}

// =======================
// STATUS SENSOR
// =======================
String getSensorStatus(
  float ph,
  float tds,
  float turb
) {

  if (ph == 0 || tds == 0) {
    return "ERROR";
  }

  return "SUCCESS";
}

// =======================
// WATER QUALITY
// =======================
String getQuality(
  float ph,
  float tds,
  float turb
) {

  if (
    ph >= 6.5 &&
    ph <= 8.5 &&
    tds < 300 &&
    turb < 5
  ) {
    return "GOOD";
  }

  else if (
    (tds >= 300 && tds < 600) ||
    (turb >= 5 && turb < 50)
  ) {
    return "WARNING";
  }

  else {
    return "DANGER";
  }
}

// =======================
// KONTROL LED
// =======================
void updateLED(String sensorStatus, String quality) {

  if (sensorStatus == "SUCCESS" && quality == "GOOD") {

    digitalWrite(LED_PUTIH, HIGH);
    digitalWrite(LED_MERAH, LOW);

  } else {

    digitalWrite(LED_PUTIH, LOW);
    digitalWrite(LED_MERAH, HIGH);
  }
}

// =======================
// MQTT RECONNECT
// =======================
void reconnectMQTT() {

  while (!mqttClient.connected()) {

    Serial.print("Connecting MQTT...");

    String clientId = "ESP32-AquaSense-";

    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {

      Serial.println("CONNECTED");

    } else {

      Serial.print("FAILED, rc=");
      Serial.print(mqttClient.state());

      Serial.println(" retry 3 seconds");

      delay(3000);
    }
  }
}

// =======================
// KIRIM DATA MQTT
// =======================
void sendMQTT(
  float ph,
  float tds,
  float turbidity,
  String sensorStatus,
  String quality
) {

  String payload = "{";

  payload += "\"ph\":" + String(ph, 2) + ",";
  payload += "\"tds\":" + String(tds, 0) + ",";
  payload += "\"turbidity\":" + String(turbidity, 2) + ",";
  payload += "\"sensor_status\":\"" + sensorStatus + "\",";
  payload += "\"water_quality\":\"" + quality + "\"";

  if (mqttClient.connected()) {

    // =======================
    // TIMESTAMP PENGIRIMAN
    // =======================
    struct timeval tv;
    gettimeofday(&tv, NULL);

    if (ntpSynced && tv.tv_sec > NTP_VALID_TIME) {

      long long timestamp_sent =
        (long long)tv.tv_sec * 1000LL +
        tv.tv_usec / 1000;

      char tsBuf[21];

      snprintf(
        tsBuf,
        sizeof(tsBuf),
        "%lld",
        timestamp_sent
      );

      payload += ",\"timestamp_sent\":";
      payload += tsBuf;

      Serial.print("Timestamp Sent: ");
      Serial.println(tsBuf);

    } else {

      Serial.println(
        "WARNING: NTP belum sinkron, timestamp tidak tersedia"
      );
    }

    payload += "}";

    // =======================
    // PUBLISH MQTT
    // =======================
    bool published = mqttClient.publish(
      mqtt_topic,
      payload.c_str()
    );

    if (published) {

      Serial.println("MQTT: SENT");
      Serial.println(payload);

    } else {

      Serial.println("MQTT: PUBLISH FAILED");
    }

  } else {

    Serial.println("MQTT: NOT CONNECTED");
  }
}

// =======================
// DISPLAY + KIRIM DATA
// =======================
void readAndDisplay() {

  ph_act = readPH();

  tdsValue = readTDS();

  turbidityNTU = readTurbidity();

  String sensorStatus =
    getSensorStatus(
      ph_act,
      tdsValue,
      turbidityNTU
    );

  String quality =
    getQuality(
      ph_act,
      tdsValue,
      turbidityNTU
    );

  // =======================
  // UPDATE LED
  // =======================
  updateLED(sensorStatus, quality);

  // =======================
  // SERIAL MONITOR
  // =======================
  Serial.print("pH: ");
  Serial.println(ph_act, 2);

  Serial.print("TDS: ");
  Serial.println(tdsValue, 0);

  Serial.print("NTU: ");
  Serial.println(turbidityNTU, 1);

  Serial.print("Sensor: ");
  Serial.println(sensorStatus);

  Serial.print("Quality: ");
  Serial.println(quality);

  Serial.println("----------------------");

  // =======================
  // GOOGLE SHEETS
  // =======================
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    String url =
      serverName +
      "?ph=" + String(ph_act, 2) +
      "&tds=" + String(tdsValue, 0) +
      "&turb=" + String(turbidityNTU, 1) +
      "&sensor=" + sensorStatus +
      "&quality=" + quality;

    http.begin(url);

    int httpCode = http.GET();

    Serial.print("HTTP: ");
    Serial.println(httpCode);

    http.end();
  }

  // =======================
  // MQTT
  // =======================
  sendMQTT(
    ph_act,
    tdsValue,
    turbidityNTU,
    sensorStatus,
    quality
  );

  // =======================
  // LCD 16x2
  // =======================
  lcd.clear();

  // Baris pertama: pH dan TDS
  lcd.setCursor(0, 0);

  lcd.print("pH:");
  lcd.print(ph_act, 1);

  lcd.print(" TDS:");
  lcd.print(tdsValue, 0);

  // Baris kedua: Turbidity
  lcd.setCursor(0, 1);

  lcd.print("Turb:");
  lcd.print(turbidityNTU, 1);
  lcd.print(" NTU");
}

// =======================
// SETUP
// =======================
void setup() {

  Serial.begin(9600);

  // =======================
  // LED SETUP
  // =======================
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_PUTIH, OUTPUT);

  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_PUTIH, LOW);

  // =======================
  // LCD SETUP
  // =======================
  lcd.init();

  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("AquaSense");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");

  analogReadResolution(12);

  analogSetAttenuation(ADC_11db);

  // =======================
  // WIFI CONNECT
  // =======================
  WiFi.begin(
    ssid,
    password
  );

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    Serial.print(".");
  }

  Serial.println();

  Serial.println("WiFi Connected");

  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  lcd.clear();

  lcd.print("WiFi Connected");

  // =======================
  // SINKRONISASI NTP
  // =======================
  configTime(
    0,
    0,
    "pool.ntp.org",
    "time.google.com"
  );

  Serial.println();
  Serial.println("Sinkronisasi NTP...");

  ntpSynced = false;

  for (int i = 0; i < 30; i++) {

    if (checkNTPSync()) {

      ntpSynced = true;

      break;
    }

    delay(1000);

    Serial.print(".");
  }

  if (ntpSynced) {

    Serial.println();
    Serial.println("NTP: SYNCHRONIZED");

    struct timeval tv;
    gettimeofday(&tv, NULL);

    Serial.print("Unix Timestamp: ");

    Serial.println(
      (long long)tv.tv_sec * 1000LL +
      tv.tv_usec / 1000
    );

  } else {

    Serial.println();
    Serial.println("NTP: NOT SYNCHRONIZED");

    Serial.println(
      "Periksa koneksi WiFi dan server NTP."
    );
  }

  delay(1500);

  lcd.clear();

  // =======================
  // MQTT SETUP
  // =======================
  mqttClient.setServer(
    mqtt_server,
    mqtt_port
  );

  reconnectMQTT();

  // =======================
  // KALIBRASI TURBIDITY
  // =======================
  long sum = 0;

  const int samples = 30;

  for (int i = 0; i < samples; i++) {

    sum += analogRead(TURBIDITY_PIN);

    delay(5);
  }

  clearVoltage =
    (sum / (float)samples) *
    (3.3 / 4095.0);

  Serial.print("Kalibrasi clearVoltage: ");

  Serial.println(clearVoltage);
}

// =======================
// LOOP
// =======================
void loop() {

  // =======================
  // MQTT CONNECTION
  // =======================
  if (!mqttClient.connected()) {

    reconnectMQTT();
  }

  mqttClient.loop();

  // =======================
  // PERIKSA STATUS SNTP
  // =======================
  if (!ntpSynced && checkNTPSync()) {

    ntpSynced = true;

    Serial.println("NTP: SYNCHRONIZED");

    struct timeval tv;
    gettimeofday(&tv, NULL);

    Serial.print("Unix Timestamp: ");

    Serial.println(
      (long long)tv.tv_sec * 1000LL +
      tv.tv_usec / 1000
    );
  }

  // =======================
  // TIMER 1 MENIT
  // =======================
  unsigned long currentMillis = millis();

  if (
    currentMillis - previousMillis >= interval
  ) {

    previousMillis = currentMillis;

    readAndDisplay();
  }
} 